<script setup lang="ts">
import LoginForm from '~/features/auth/components/LoginForm.vue';

// layout: false (bukan layout 'auth' custom) - halaman login TIDAK butuh layout apa pun, cuma
// perlu tidak dibungkus AppLayout (default). Nuxt lazy-load layout custom lewat LayoutLoader
// (async component boundary) yang sempat memicu hydration mismatch di console pas dev - `false`
// sepenuhnya melewati mekanisme itu, bukan cuma bikin layout kosong.
definePageMeta({ layout: false });
</script>

<template>
  <LoginForm />
</template>
