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

export function apiFetch<T = unknown>(url: string, opts: ApiFetchOptions = {}): Promise<T> {
  if (import.meta.server) {
    return rawFetch(url, { ...opts, headers: useRequestHeaders(['cookie']) }) as Promise<T>;
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
