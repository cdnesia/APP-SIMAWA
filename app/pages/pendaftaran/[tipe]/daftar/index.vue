<script setup lang="ts">
import { getKegiatanConfigBySlug } from '~/features/kegiatan-mahasiswa/config';
import DaftarKegiatanPage from '~/features/kegiatan-mahasiswa/components/DaftarKegiatanPage.vue';

// Judul tab mengikuti jenis kegiatan di URL (kkn/pkl/seminar/sidang) - computed supaya ikut
// berubah saat pindah antar jenis kegiatan tanpa remount.
const route = useRoute();
useHead({
  title: computed(() => {
    const config = getKegiatanConfigBySlug(route.params.tipe as string);
    return config ? `Form Pendaftaran ${config.labelPanjang}` : 'Pendaftaran';
  }),
});
</script>

<template>
  <DaftarKegiatanPage />
</template>
