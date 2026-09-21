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
  // SIMAWA_API_BASE - APP-SIMAWA tidak lagi punya kredensial M2M sendiri ke SERVICE-PUBLIC
  // (dipindah ke SERVICE-SIMAWA 2026-09-19, termasuk untuk fitur tagihan yang dulu di sini).
  // SERVICE_SECRET - shared secret perimeter server-to-server yang WAJIB dikirim di header
  // X-Service-Secret pada setiap fetch ke SERVICE-SIMAWA (lihat server/utils/simawaApi.ts),
  // nilainya harus SAMA PERSIS dengan SERVICE_SECRET di .env SERVICE-SIMAWA.
  runtimeConfig: {
    simawaApiBase: process.env.SIMAWA_API_BASE ?? 'http://localhost:4000/api',
    serviceSecret: process.env.SERVICE_SECRET ?? '',
  },
});
