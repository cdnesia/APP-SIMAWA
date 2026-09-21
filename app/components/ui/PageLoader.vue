<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue';

// Satu tampilan loading yang dipakai di SEMUA halaman (dashboard, KRS, KHS, tagihan, jadwal
// kuliah, EDOM, kegiatan mahasiswa, login) - sebelumnya tiap halaman punya skeleton animate-pulse
// sendiri-sendiri dengan bentuk berbeda-beda, sekarang disatukan jadi satu komponen supaya
// pengalaman "sedang memuat" konsisten di mana pun. Dipasangkan dengan useMinLoading() di
// pemanggilnya supaya tampil minimal 5 detik.
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    size?: 'sm' | 'lg';
  }>(),
  {
    title: 'Memuat data...',
    description: '',
    size: 'sm',
  },
);
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-10 text-center">
    <LoaderCircle :size="size === 'lg' ? 40 : 28" class="animate-spin text-[var(--color-primary)]" />
    <div>
      <p class="text-sm font-semibold text-[var(--color-text)]">{{ title }}</p>
      <p v-if="description" class="mt-1 text-xs text-[var(--color-text-muted)]">{{ description }}</p>
    </div>
  </div>
</template>
