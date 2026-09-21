<template>
  <!-- Progress bar tipis di paling atas viewport saat navigasi/fetch data halaman berjalan -
       bawaan Nuxt (useLoadingIndicator di baliknya), dipakai supaya user dapat feedback instan
       tanpa harus nunggu skeleton per-halaman muncul dulu. -->
  <NuxtLoadingIndicator color="var(--color-primary)" :height="3" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ToastContainer />
</template>
