<script setup lang="ts">
import LoginForm from '~/features/auth/components/LoginForm.vue';

// layout: false (bukan layout 'auth' custom) - halaman login TIDAK butuh layout apa pun, cuma
// perlu tidak dibungkus AppLayout (default). Nuxt lazy-load layout custom lewat LayoutLoader
// (async component boundary) yang sempat memicu hydration mismatch di console pas dev - `false`
// sepenuhnya melewati mekanisme itu, bukan cuma bikin layout kosong.
definePageMeta({ layout: false });

// ===== SEO =====
// Halaman ini satu-satunya halaman publik, jadi inilah yang muncul di Google saat orang mencari
// "simawa", "simawa um jambi", atau "siakad um jambi". Kata kunci dimasukkan secara alami ke
// title & description (dua elemen yang benar-benar dipakai Google untuk ranking & cuplikan).
const { siteUrl } = useRuntimeConfig().public;
const urlHalaman = `${siteUrl}/login`;
const urlLogo = `${siteUrl}/logo-umjambi.png`;

const JUDUL = 'SIMAWA UM Jambi – SIAKAD Universitas Muhammadiyah Jambi';
const DESKRIPSI =
  'SIMAWA adalah SIAKAD (Sistem Informasi Akademik) mahasiswa Universitas Muhammadiyah Jambi. Akses KRS, KHS, jadwal kuliah, dan tagihan secara online.';

useHead({
  title: JUDUL,
  // Judul lengkap tanpa akhiran " · SIMAWA" dari titleTemplate global (sudah memuat kata SIMAWA).
  titleTemplate: null,
  link: [{ rel: 'canonical', href: urlHalaman }],
  script: [
    {
      // Data terstruktur (schema.org) - membantu Google memahami nama situs & institusinya.
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${siteUrl}/#website`,
            url: siteUrl,
            name: 'SIMAWA UM Jambi',
            alternateName: ['SIMAWA', 'SIAKAD UM Jambi', 'Sistem Informasi Mahasiswa Universitas Muhammadiyah Jambi'],
            inLanguage: 'id-ID',
            publisher: { '@id': `${siteUrl}/#organisasi` },
          },
          {
            '@type': 'CollegeOrUniversity',
            '@id': `${siteUrl}/#organisasi`,
            name: 'Universitas Muhammadiyah Jambi',
            alternateName: 'UM Jambi',
            url: 'https://umjambi.ac.id',
            logo: urlLogo,
          },
          {
            '@type': 'WebPage',
            '@id': `${urlHalaman}#halaman`,
            url: urlHalaman,
            name: JUDUL,
            description: DESKRIPSI,
            isPartOf: { '@id': `${siteUrl}/#website` },
            inLanguage: 'id-ID',
          },
        ],
      }),
    },
  ],
});

useSeoMeta({
  description: DESKRIPSI,
  keywords:
    'simawa, simawa um jambi, simawa umjambi, siakad um jambi, siakad umjambi, siakad universitas muhammadiyah jambi, sistem informasi akademik um jambi, portal mahasiswa um jambi, krs online um jambi',
  robots: 'index, follow',
  author: 'Universitas Muhammadiyah Jambi',
  // Open Graph & Twitter - tampilan pratinjau saat tautan dibagikan di WhatsApp, Facebook, X, dll.
  ogType: 'website',
  ogSiteName: 'SIMAWA UM Jambi',
  ogLocale: 'id_ID',
  ogTitle: JUDUL,
  ogDescription: DESKRIPSI,
  ogUrl: urlHalaman,
  ogImage: urlLogo,
  ogImageAlt: 'Lambang Universitas Muhammadiyah Jambi',
  twitterCard: 'summary',
  twitterTitle: JUDUL,
  twitterDescription: DESKRIPSI,
  twitterImage: urlLogo,
});
</script>

<template>
  <LoginForm />
</template>
