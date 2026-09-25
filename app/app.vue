<script setup lang="ts">
import faviconUrl from '~/assets/favicon.png';

// Favicon diambil dari app/assets/favicon.png (diproses Vite supaya ter-hash/optimasi),
// bukan dari public/favicon.ico - link rel="icon" di head menimpa fallback /favicon.ico bawaan Nuxt.
// titleTemplate WAJIB ada - tanpa <title> sama sekali browser memakai URL sebagai judul tab.
// Tiap halaman (pages/**) cukup set useHead({ title }) -> jadi "<judul> · SIMAWA"; halaman yang
// tidak set title jatuh ke judul default.
useHead({
  titleTemplate: (title) => (title ? `${title} · SIMAWA` : 'SIMAWA · Universitas Muhammadiyah Jambi'),
  link: [{ rel: 'icon', type: 'image/png', href: faviconUrl }],
});

// Loading pindah halaman DISAMAKAN di seluruh app - dulu cuma progress bar tipis (NuxtLoadingIndicator)
// yang gampang tidak kelihatan. `page:start`/`page:finish` adalah hook bawaan Nuxt yang menandai
// AWAL navigasi (component halaman baru mulai di-setup, termasuk data fetch top-level await-nya)
// sampai SELESAI (halaman baru sudah ter-mount dengan data siap) - persis rentang waktu yang perlu
// ditutup loading, dipaksa tampil minimal 5 detik lewat useMinLoading() yang sama dipakai semua
// komponen halaman lain (lihat PageLoader.vue).
const isNavigating = ref(false);
const isNavigatingVisible = useMinLoading(isNavigating);

const nuxtApp = useNuxtApp();
nuxtApp.hook('page:start', () => { isNavigating.value = true; });
nuxtApp.hook('page:finish', () => { isNavigating.value = false; });
</script>

<template>
  <div
    v-if="isNavigatingVisible"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-bg)]/95 backdrop-blur-sm"
  >
    <PageLoader size="lg" title="Memuat halaman..." />
  </div>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ToastContainer />
</template>
