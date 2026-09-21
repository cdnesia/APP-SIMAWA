import type { H3Event } from 'h3';

// Proxy fetch ke SERVICE-SIMAWA - pakai fetch() bawaan (Web Fetch API standar, tersedia global di
// Nitro/Node) BUKAN $fetch (ofetch) bawaan Nuxt, karena kita butuh akses mentah ke Response
// (status asli, Set-Cookie header, streaming byte PDF) - $fetch auto-throw & auto-parse JSON,
// kurang cocok untuk passthrough proxy generik seperti ini.
function simawaApiBase(): string {
  return useRuntimeConfig().simawaApiBase;
}

export function extractCookieValue(setCookie: string, name: string): string | null {
  const match = setCookie.match(new RegExp(`^${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

// Ambil value refresh token dari daftar Set-Cookie response backend Express. Dipakai baik oleh
// refreshSimawaSession() di sini maupun langsung oleh server/api/auth/login.post.ts (backend
// mengirim Set-Cookie refreshToken di kedua endpoint itu, format & cara baca-nya sama persis).
export function extractRefreshTokenFromSetCookie(res: Response): string | null {
  return res.headers
    .getSetCookie()
    .map((c) => extractCookieValue(c, 'refreshToken'))
    .find((v): v is string => v !== null) ?? null;
}

// Single-flight dedup: kalau beberapa request paralel kena 401 bersamaan (mis. dashboard fetch
// beberapa endpoint sekaligus persis saat access token expired), cukup satu yang trigger refresh
// ke backend, yang lain ikut menunggu hasil yang sama - backend cuma simpan 1 refresh token aktif
// per user (rotate tiap kali dipanggil), jadi 2 refresh konkuren pakai refresh token lama yang
// sama akan bikin salah satu "kalah" dan cookie jadi refresh token yang sudah invalid. Valid
// selama Nitro jalan sebagai proses Node persisten (bukan serverless per-invocation).
let refreshInFlight: Promise<string | null> | null = null;

export async function refreshSimawaSession(event: H3Event): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getSimawaRefreshToken(event);
    if (!refreshToken) return null;

    const res = await fetch(`${simawaApiBase()}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${refreshToken}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      clearSimawaSession(event);
      return null;
    }

    const body = (await res.json()) as { data: { accessToken: string } };
    const newRefreshToken = extractRefreshTokenFromSetCookie(res);

    if (!newRefreshToken) {
      clearSimawaSession(event);
      return null;
    }

    setSimawaSession(event, body.data.accessToken, newRefreshToken);
    return body.data.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

// Proxy fetch ke SERVICE-SIMAWA, attach Bearer dari cookie Nitro sendiri, auto refresh+retry
// sekali kalau backend balas 401. `init.body` HARUS string/undefined (bukan ReadableStream) -
// dipanggil dua kali kalau perlu retry setelah refresh, stream cuma bisa dibaca sekali.
export async function simawaFetch(
  event: H3Event,
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Promise<Response> {
  const doFetch = async (token: string | undefined) =>
    fetch(`${simawaApiBase()}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });

  const accessToken = getSimawaAccessToken(event);
  let res = await doFetch(accessToken);

  const isAuthEndpoint = path === '/auth/refresh' || path === '/auth/login';
  if (res.status === 401 && !isAuthEndpoint) {
    const newAccessToken = await refreshSimawaSession(event);
    if (newAccessToken) {
      res = await doFetch(newAccessToken);
    }
  }

  return res;
}
