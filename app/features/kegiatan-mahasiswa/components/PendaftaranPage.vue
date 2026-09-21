<script setup lang="ts">
import { Copy, History } from '@lucide/vue';
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
const isLoading = useMinLoading(pending);

watch(error, (err) => {
  if (err && !hasShownError.value) {
    hasShownError.value = true;
    showToast(getApiErrorMessage(err, '✕ Gagal memuat data. Periksa koneksi Anda.'), 'error');
  }
});

const riwayat = computed(() => (data.value?.items ?? []).filter((item) => item.tipe === config.tipe));

// Sama seperti copyKodeBayar() di DashboardPage.vue - nomor tagihan dipakai mahasiswa sebagai
// kode bayar/nomor VA saat transfer.
async function copyKodeBayar(kodeBayar: string) {
  try {
    await navigator.clipboard.writeText(kodeBayar);
    showToast('✓ Kode bayar disalin', 'success');
  } catch {
    showToast('✕ Gagal menyalin kode bayar. Coba lagi.', 'error');
  }
}
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

    <Card v-if="isLoading">
      <PageLoader />
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
        <table class="w-full min-w-[860px] text-left text-sm">
          <thead class="border-b border-[var(--color-border)] bg-[var(--color-bg)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr>
              <th class="px-4 py-3 font-semibold">Nama Kegiatan</th>
              <th class="px-4 py-3 font-semibold">Kode Bayar / VA</th>
              <th class="px-4 py-3 text-right font-semibold">Biaya</th>
              <th class="px-4 py-3 font-semibold">Tanggal Daftar</th>
              <th class="px-4 py-3 font-semibold">Batas Akhir Pembayaran</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            <tr v-for="(item, idx) in riwayat" :key="idx">
              <td class="px-4 py-3 font-medium text-[var(--color-text)]">{{ item.namaKegiatan ?? '-' }}</td>
              <td class="whitespace-nowrap px-4 py-3">
                <div v-if="item.kodeBayar" class="flex items-center gap-2">
                  <span class="font-mono text-[var(--color-text)]">{{ item.kodeBayar }}</span>
                  <button
                    type="button"
                    class="flex shrink-0 items-center gap-1 rounded-md border border-[var(--color-border-dark)] px-2 py-1 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
                    @click="copyKodeBayar(item.kodeBayar)"
                  >
                    <Copy :size="12" />
                    Salin
                  </button>
                </div>
                <span v-else class="text-[var(--color-text-muted)]">-</span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right text-[var(--color-text-muted)]">{{ formatRupiah(item.biayaPendaftaran) }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">{{ formatTanggal(item.tanggalPendaftaran) }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">{{ item.batasAkhirPembayaran ? formatTanggal(item.batasAkhirPembayaran) : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
