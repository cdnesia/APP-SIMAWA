import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/fonts', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  // Transisi fade antar halaman (class `.page-*` didefinisikan di assets/css/main.css) - supaya
  // perpindahan halaman tidak snap instan/kaku. `out-in` = halaman lama selesai fade-out dulu
  // baru halaman baru fade-in, mencegah 2 halaman tumpang-tindih sesaat.
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    // lang="id" membantu Google mengenali halaman berbahasa Indonesia (SEO & aksesibilitas).
    head: { htmlAttrs: { lang: 'id' } },
  },
  // Default Nuxt menambahkan prefix folder ke nama komponen (mis. components/ui/Button.vue jadi
  // <UiButton/>) - dimatikan di sini supaya nama komponen tetap flat (<Button/>, <Card/>, dst),
  // konsisten dengan penamaan komponen versi sebelumnya.
  components: [
    { path: '~/components/ui', pathPrefix: false },
    { path: '~/components/layout', pathPrefix: false },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  // @nuxt/fonts otomatis mendeteksi `font-family` yang dipakai di CSS (lihat assets/css/main.css)
  // dan self-host font-nya (Plus Jakarta Sans, wajib per standar UI CLAUDE.md) - tidak perlu
  // konfigurasi manual di sini.
  // Env var server-only (TIDAK ada di runtimeConfig.public) - tidak pernah ke-bundle ke client.
  // SIMAWA_API_BASE - base URL REST-API-SIMAWA TERMASUK /v1 (mis. https://rest-api-simawa.umjambi.ac.id/v1). Mahasiswa
  // login langsung dengan NPM + password; APP-SIMAWA TIDAK menyimpan client_id/secret maupun shared secret apa pun.
  runtimeConfig: {
    simawaApiBase: process.env.SIMAWA_API_BASE ?? 'http://localhost:8000/v1',
    // Domain publik aplikasi - dipakai canonical URL, Open Graph, robots.txt & sitemap.xml (SEO).
    // Bisa diganti per lingkungan lewat env NUXT_PUBLIC_SITE_URL tanpa ubah kode.
    public: {
      siteUrl: 'https://simawa.umjambi.ac.id',
    },
  },
});
