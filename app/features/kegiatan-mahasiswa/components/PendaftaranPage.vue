<script setup lang="ts">
import { History } from '@lucide/vue';
import { getRiwayatKegiatanMahasiswa } from '../services/api';
import { getKegiatanConfigBySlug } from '../config';
import { formatRupiah, formatTanggal } from '~/utils/format';

// KKN, PKL, Seminar Proposal, dan Sidang Tugas Akhir semuanya dilayani satu endpoint backend
// generik (/kegiatan-mahasiswa) dan tampilannya identik - lihat features/kegiatan-mahasiswa/config.ts,
// jadi 1 route dinamis dipakai ulang untuk keempatnya (bukan 4 halaman terpisah).
const route = useRoute();
const config = getKegiatanConfigBySlug(route.params.tipe as string);
if (!config) {
  throw createError({ statusCode: 404, statusMessage: 'Jenis kegiatan tidak ditemukan' });
}

const { showToast } = useToast();
const hasShownError = ref(false);
const daftarPath = `${config.path}/daftar`;

const { data, pending, error } = await useAsyncData('kegiatan-mahasiswa-riwayat', () => getRiwayatKegiatanMahasiswa());

watch(error, (err) => {
  if (err && !hasShownError.value) {
    hasShownError.value = true;
    showToast(getApiErrorMessage(err, '✕ Gagal memuat data. Periksa koneksi Anda.'), 'error');
  }
});

const riwayat = computed(() => (data.value?.items ?? []).filter((item) => item.tipe === config.tipe));
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader :title="`Pendaftaran ${config.label}`" :description="`Riwayat pendaftaran ${config.labelPanjang} Anda.`">
      <template #actions>
        <NuxtLink
          :to="daftarPath"
          class="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          <component :is="config.icon" :size="16" />
          Daftar {{ config.label }}
        </NuxtLink>
      </template>
    </PageHeader>

    <Card v-if="pending">
      <div class="animate-pulse space-y-3 p-1">
        <div v-for="i in 3" :key="i" class="h-10 rounded-lg bg-[var(--color-border)]" />
      </div>
    </Card>

    <Card v-else-if="error">
      <p class="py-8 text-center text-sm text-[var(--color-danger)]">
        Gagal memuat riwayat {{ config.label }}. Periksa koneksi Anda, atau coba muat ulang halaman.
      </p>
    </Card>

    <Card v-else-if="riwayat.length === 0">
      <EmptyState :icon="History" title="Belum ada riwayat pendaftaran" :description="`Anda belum pernah mendaftar ${config.label}. Klik \`Daftar ${config.label}\` untuk melihat pilihan yang tersedia.`">
        <template #action>
          <NuxtLink
            :to="daftarPath"
            class="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
          >
            <component :is="config.icon" :size="16" />
            Daftar {{ config.label }}
          </NuxtLink>
        </template>
      </EmptyState>
    </Card>

    <div v-else class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[520px] text-left text-sm">
          <thead class="border-b border-[var(--color-border)] bg-[var(--color-bg)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr>
              <th class="px-4 py-3 font-semibold">Nama Kegiatan</th>
              <th class="px-4 py-3 font-semibold">Biaya</th>
              <th class="px-4 py-3 font-semibold">Tanggal Daftar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            <tr v-for="(item, idx) in riwayat" :key="idx">
              <td class="px-4 py-3 font-medium text-[var(--color-text)]">{{ item.namaKegiatan ?? '-' }}</td>
              <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ formatRupiah(item.biayaPendaftaran) }}</td>
              <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ formatTanggal(item.tanggalPendaftaran) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
