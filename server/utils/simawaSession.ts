import { randomUUID } from 'node:crypto';
import type { H3Event } from 'h3';

// Cookie MILIK Nitro sendiri (bukan cookie asli backend Express `refreshToken`, path `/api/auth`)
// - httpOnly, cuma bisa di-set/dibaca dari server/api/** (h3 getCookie/setCookie/deleteCookie),
// TIDAK PERNAH lewat useCookie() composable client-side. `path: '/'` (bukan scoping backend)
// supaya semua route Nitro & middleware client bisa melihat cookie ini.
export const ACCESS_COOKIE = 'simawa_access';
export const REFRESH_COOKIE = 'simawa_refresh';

// Flag cookie TERPISAH, SENGAJA bukan httpOnly - isinya cuma '1', BUKAN token asli. Nuxt SPA
// navigation (NuxtLink/router.replace) TIDAK selalu round-trip ke server, jadi middleware client
// (app/middleware/auth.global.ts) butuh cara baca "ada sesi atau tidak" lewat `useCookie()` biasa
// (document.cookie) - browser SENGAJA menyembunyikan cookie httpOnly dari document.cookie (itu
// justru tujuan httpOnly, cegah XSS baca token), jadi `simawa_refresh`/`simawa_access` MUSTAHIL
// dibaca dari sini. Tanpa flag ini, middleware selalu melihat "tidak ada sesi" begitu navigasi
// client-side pertama terjadi setelah login -> redirect loop balik ke /login.
export const SESSION_FLAG_COOKIE = 'simawa_session';

// Token CSRF (double-submit cookie) - temuan audit keamanan: proxy catch-all
// server/api/simawa/[...path].ts sebelumnya cuma mengandalkan SameSite=Lax tanpa lapisan kedua.
// SENGAJA bukan httpOnly (sama alasannya dengan SESSION_FLAG_COOKIE) - client JS BUTUH baca
// nilainya untuk dikirim ulang sebagai header `x-csrf-token` (lihat app/utils/apiFetch.ts).
// Keamanannya bukan dari kerahasiaan nilainya, tapi dari fakta bahwa situs lain tidak bisa
// MEMBACA cookie ini (same-origin policy) untuk ikut menyertakannya sebagai header di request
// palsu mereka - beda dari cookie yang otomatis ikut terkirim browser tanpa perlu dibaca dulu.
export const CSRF_COOKIE = 'simawa_csrf';

const ACCESS_MAX_AGE = 15 * 60; // 15 menit, detik (h3 pakai detik, beda dari Next.js yang pakai ms)
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 hari

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

function flagCookieOptions(maxAge: number) {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function getSimawaAccessToken(event: H3Event): string | undefined {
  return getCookie(event, ACCESS_COOKIE);
}

export function getSimawaRefreshToken(event: H3Event): string | undefined {
  return getCookie(event, REFRESH_COOKIE);
}

export function setSimawaSession(event: H3Event, accessToken: string, refreshToken: string) {
  setCookie(event, ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
  setCookie(event, REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
  setCookie(event, SESSION_FLAG_COOKIE, '1', flagCookieOptions(REFRESH_MAX_AGE));
  setCookie(event, CSRF_COOKIE, randomUUID(), flagCookieOptions(REFRESH_MAX_AGE));
}

export function setSimawaAccessToken(event: H3Event, accessToken: string) {
  setCookie(event, ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
}

export function getSimawaCsrfCookie(event: H3Event): string | undefined {
  return getCookie(event, CSRF_COOKIE);
}

export function clearSimawaSession(event: H3Event) {
  deleteCookie(event, ACCESS_COOKIE, { path: '/' });
  deleteCookie(event, REFRESH_COOKIE, { path: '/' });
  deleteCookie(event, SESSION_FLAG_COOKIE, { path: '/' });
  deleteCookie(event, CSRF_COOKIE, { path: '/' });
}
