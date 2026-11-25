import type { H3Event } from 'h3';

// Proxy fetch ke REST-API-SIMAWA (backend Laravel) - pakai fetch() bawaan (Web Fetch API standar, tersedia global di
// Nitro/Node) BUKAN $fetch (ofetch) bawaan Nuxt, karena kita butuh akses mentah ke Response (status asli, header
// Retry-After, streaming byte PDF) - $fetch auto-throw & auto-parse JSON, kurang cocok untuk passthrough proxy.
//
// Mahasiswa login LANGSUNG dengan NPM + password (POST /v1/mahasiswa/login) - TIDAK ada client_id/secret maupun
// shared secret di APP-SIMAWA. Token login (akses 15 menit + refresh 7 hari) disimpan di cookie httpOnly milik Nitro
// (server/utils/simawaSession.ts), tidak pernah bisa dibaca JavaScript browser.
export function simawaApiBase(): string {
  return useRuntimeConfig().simawaApiBase.replace(/\/+$/, '');
}

// IP pengguna untuk REST-API-SIMAWA (batas login per IP & throttle per IP): rantai X-Forwarded-For yang masuk + IP
// pemanggil langsung (pengguna, atau reverse proxy di depan Nitro bila ada). REST-API-SIMAWA hanya memercayai header
// ini bila IP server Nitro (dan proxy di depannya) ada di TRUSTED_PROXIES-nya - IP palsu kiriman pengguna di ujung
// kiri rantai otomatis diabaikan (dibaca dari kanan, melewati proxy tepercaya saja).
export function forwardedForHeader(event: H3Event): Record<string, string> {
  const rantai = [getRequestHeader(event, 'x-forwarded-for'), event.node.req.socket?.remoteAddress]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v))
    .join(', ');
  return rantai ? { 'X-Forwarded-For': rantai } : {};
}

// Single-flight dedup: kalau beberapa request paralel kena 401 bersamaan (mis. dashboard fetch beberapa endpoint
// sekaligus persis saat access token expired), cukup satu yang trigger refresh, yang lain ikut menunggu hasil yang
// sama - refresh token DIROTASI tiap dipakai (yang lama langsung hangus), jadi 2 refresh konkuren dengan refresh token
// yang sama bikin salah satu gagal 401. Valid selama Nitro jalan sebagai proses Node persisten.
let refreshInFlight: Promise<string | null> | null = null;

export async function refreshSimawaSession(event: H3Event): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getSimawaRefreshToken(event);
    if (!refreshToken) return null;

    const res = await fetch(`${simawaApiBase()}/mahasiswa/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...forwardedForHeader(event) },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    }).catch(() => null);

    if (!res?.ok) {
      clearSimawaSession(event);
      return null;
    }

    const body = (await res.json()) as { data?: { access_token?: string; refresh_token?: string } };
    const accessToken = body.data?.access_token;
    const newRefreshToken = body.data?.refresh_token;
    if (!accessToken || !newRefreshToken) {
      clearSimawaSession(event);
      return null;
    }

    setSimawaSession(event, accessToken, newRefreshToken);
    return accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

// Proxy fetch ke REST-API-SIMAWA, attach Bearer dari cookie Nitro sendiri, auto refresh+retry sekali kalau backend
// balas 401. `init.body` HARUS string/undefined (bukan ReadableStream) - dipanggil dua kali kalau perlu retry setelah
// refresh, stream cuma bisa dibaca sekali.
export async function simawaFetch(
  event: H3Event,
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Promise<Response> {
  const doFetch = async (token: string | undefined) =>
    fetch(`${simawaApiBase()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init.headers,
        ...forwardedForHeader(event),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });

  const accessToken = getSimawaAccessToken(event);
  let res = await doFetch(accessToken);

  if (res.status === 401 && getSimawaRefreshToken(event)) {
    const newAccessToken = await refreshSimawaSession(event);
    if (newAccessToken) {
      res = await doFetch(newAccessToken);
    }
  }

  return res;
}

async function bacaJson(res: Response): Promise<unknown> {
  const teks = await res.text();
  try {
    return teks ? JSON.parse(teks) : null;
  } catch {
    return null; // bukan JSON (mis. halaman error proxy) - ditangani sebagai error umum
  }
}

// Teruskan respons REST-API-SIMAWA ke browser dalam format lama SERVICE-SIMAWA:
// - PDF: byte mentah + Content-Type/Content-Disposition yang sama;
// - sukses: { success, message, data } dengan kunci data camelCase (request_id dibuang);
// - gagal: { success:false, message, errors, code } - status HTTP SAMA dengan backend.
export async function teruskanRespons(event: H3Event, res: Response) {
  setResponseStatus(event, res.status);
  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/pdf')) {
    setResponseHeader(event, 'Content-Type', 'application/pdf');
    const contentDisposition = res.headers.get('content-disposition');
    if (contentDisposition) setResponseHeader(event, 'Content-Disposition', contentDisposition);
    return Buffer.from(await res.arrayBuffer());
  }

  setResponseHeader(event, 'Content-Type', 'application/json');
  const json = await bacaJson(res);

  if (!res.ok) {
    const error = keErrorLama(json);
    if (res.status === 429) {
      const retryAfterSeconds = Number(res.headers.get('retry-after'));
      error.retryAfterSeconds = Number.isFinite(retryAfterSeconds) && res.headers.has('retry-after') ? retryAfterSeconds : null;
    }
    return error;
  }

  const body = (json ?? {}) as { success?: boolean; message?: string; data?: unknown };
  return { success: true, message: body.message ?? 'Berhasil', data: keKamel(body.data ?? null) };
}
