// $fetch biasa TIDAK otomatis membawa cookie browser saat dipanggil dari SISI SERVER (SSR) -
// beda dari fetch di browser yang otomatis ikut same-origin. Setiap halaman yang pakai
// useAsyncData() me-render dulu di server sebelum hydrate ke client, jadi TANPA wrapper ini
// setiap panggilan ke /api/simawa/** dkk selama SSR akan balas 401 "Token tidak ditemukan" -
// bug nyata yang sempat lolos karena testing sebelumnya cuma cek status HTTP halaman (selalu
// 200 walau isinya error banner), bukan isi datanya.
//
// `useRequestHeaders(['cookie'])` WAJIB dipanggil SINKRON (sebelum baris `await` manapun) di
// dalam fungsi ini - begitu dipanggil di sini (baris pertama fungsi async manapun yang
// memanggilnya), context request masih valid karena belum ada suspend point yang dilewati.
type ApiFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  query?: Record<string, unknown>;
  responseType?: 'json' | 'blob';
};

// Signature sederhana buat $fetch, melewati generic asli sepenuhnya - typed-route inference
// bawaan $fetch (dicocokkan ke SELURUH route map Nitro, termasuk catch-all [...path]) meledak
// "excessive stack depth" kalau dipanggil lewat wrapper generik seperti ini. Bukan bug logic -
// $fetch tetap ofetch yang sama saat runtime, cuma di sisi TypeScript "dibutakan" dari route map.
const rawFetch = $fetch as unknown as (url: string, opts: Record<string, unknown>) => Promise<unknown>;

// 401 dari endpoint ini BUKAN tanda sesi habis (mis. NPM/password salah saat login) - jangan diarahkan ke /login.
const URL_TANPA_REDIRECT_401 = new Set(['/api/auth/login']);

// Penjaga di browser supaya beberapa request paralel yang sama-sama kena 401 (mis. dashboard memuat beberapa
// endpoint sekaligus) hanya memicu SATU redirect. Di server tidak dipakai - variabel modul dibagi antar request.
let sedangKeLogin = false;

function statusDariError(err: unknown): number | undefined {
  const e = err as { statusCode?: number; status?: number; response?: { status?: number } } | undefined;
  return e?.statusCode ?? e?.status ?? e?.response?.status;
}

// Sesi habis: hapus cookie penanda sesi + state user, lalu arahkan ke /login (membawa halaman asal di ?redirect dan
// ?alasan=sesi-berakhir supaya LoginForm menampilkan peringatan - toast tidak bisa langsung dari SSR).
// WAJIB dipanggil di dalam nuxtApp.runWithContext (dipanggil setelah await).
async function arahkanKeLogin(): Promise<boolean> {
  const opsiCookie = { path: '/' };
  useCookie('simawa_session', opsiCookie).value = null;
  useCookie('simawa_csrf', opsiCookie).value = null;
  if (import.meta.server) {
    // Saat SSR, Set-Cookie dari panggilan internal /api/** tidak ikut ke browser - cookie httpOnly dihapus di sini.
    useCookie('simawa_access', { ...opsiCookie, httpOnly: true }).value = null;
    useCookie('simawa_refresh', { ...opsiCookie, httpOnly: true }).value = null;
  }
  useState('auth-user').value = null;

  const route = useRoute();
  if (route.path === '/login') return false;   // sudah di halaman login (mis. fetchMe sebelum login) - tidak perlu pindah
  const query: Record<string, string> = { alasan: 'sesi-berakhir' };
  if (route.fullPath !== '/') query.redirect = route.fullPath;
  await navigateTo({ path: '/login', query }, { replace: true });
  return true;
}

export function apiFetch<T = unknown>(url: string, opts: ApiFetchOptions = {}): Promise<T> {
  // Diambil SINKRON (sebelum await) - konteks Nuxt di server hilang setelah suspend point.
  const nuxtApp = useNuxtApp();
  return tanganiSesiHabis(nuxtApp, url, kirim<T>(url, opts));
}

async function tanganiSesiHabis<T>(nuxtApp: ReturnType<typeof useNuxtApp>, url: string, permintaan: Promise<T>): Promise<T> {
  try {
    return await permintaan;
  } catch (err) {
    if (statusDariError(err) !== 401 || URL_TANPA_REDIRECT_401.has(url)) throw err;

    if (import.meta.server) {
      await nuxtApp.runWithContext(arahkanKeLogin);
      throw err;
    }

    if (!sedangKeLogin) {
      sedangKeLogin = true;
      try {
        if (!(await nuxtApp.runWithContext(arahkanKeLogin))) throw err;
      } finally {
        sedangKeLogin = false;
      }
    }
    // Sengaja tidak pernah selesai: halaman yang memanggil sedang ditinggalkan menuju /login, jadi jangan sampai
    // error 401 ini masih memunculkan toast/banner "gagal memuat" sesaat sebelum pindah halaman.
    return new Promise<T>(() => {});
  }
}

function kirim<T>(url: string, opts: ApiFetchOptions): Promise<T> {
  if (import.meta.server) {
    // X-Forwarded-For ikut diteruskan supaya REST-API-SIMAWA tetap melihat IP mahasiswa (bukan IP server Nitro)
    // untuk throttle per IP saat SSR - dihitung SINKRON di sini, sama alasannya dengan useRequestHeaders di atas.
    // (Rantai sama dengan forwardedForHeader() di server/utils/simawaApi.ts: XFF masuk + IP pemanggil langsung.)
    const req = useRequestEvent()?.node.req;
    const rantai = [req?.headers['x-forwarded-for'], req?.socket?.remoteAddress]
      .flat()
      .map((v) => v?.trim())
      .filter((v): v is string => Boolean(v))
      .join(', ');
    const headers: Record<string, string> = { ...useRequestHeaders(['cookie']), ...(rantai ? { 'x-forwarded-for': rantai } : {}) };
    return rawFetch(url, { ...opts, headers }) as Promise<T>;
  }

  // Header CSRF (double-submit cookie, lihat server/api/simawa/[...path].ts) - cuma dibaca dari
  // cookie non-httpOnly `simawa_csrf` dan dikirim ulang sebagai header custom. Situs lain tidak
  // bisa membaca cookie ini (same-origin policy) untuk ikut menirunya di request palsu mereka.
  // Dikirim di SETIAP request (bukan cuma method mutasi) - server yang menentukan kapan wajib
  // divalidasi, di sini cukup selalu sertakan kalau ada.
  const csrfToken = useCookie('simawa_csrf').value;
  const headers = csrfToken ? { 'x-csrf-token': csrfToken } : undefined;
  return rawFetch(url, { ...opts, headers }) as Promise<T>;
}
