// Global middleware (jalan di SETIAP navigasi, termasuk navigasi client-side SPA seperti
// NuxtLink/router.replace - BUKAN cuma initial SSR load). Cek keberadaan cookie flag
// `simawa_session` (non-httpOnly, isi cuma '1') - BUKAN `simawa_refresh` yang httpOnly. Browser
// sengaja menyembunyikan cookie httpOnly dari `document.cookie`, dan navigasi client-side Nuxt
// TIDAK round-trip ke server (beda dari middleware Next.js yang selalu jalan server-side per
// request) - jadi `useCookie('simawa_refresh')` di sini SELALU kosong walau sesi valid, bikin
// redirect loop balik ke /login. `simawa_session` cuma penanda ada/tidak sesi, bukan token asli.
export default defineNuxtRouteMiddleware((to) => {
  const hasSession = Boolean(useCookie('simawa_session').value);

  if (to.path === '/login') {
    if (hasSession) return navigateTo('/');
    return;
  }

  if (!hasSession) return navigateTo('/login');
});
