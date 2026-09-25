<script setup lang="ts">
import { Award, CalendarCheck, CheckCircle2, Clock, GraduationCap, RefreshCw, XCircle } from '@lucide/vue';
import { getRiwayatBeasiswa } from '../services/api';
import type { StatusVerifikasiBeasiswa } from '../types';
import { formatRupiah } from '~/utils/format';
import { formatTahunAkademikLabel } from '~/utils/tahunAkademik';

// Riwayat beasiswa per tahun akademik - view-only, data dari SERVICE-SIMAWA
// (tbl_penerima_beasiswa + master_lembaga_beasiswa + status tbl_verifikasi_beasiswa).
const { showToast } = useToast();
const hasShownError = ref(false);

const { data, pending, error, refresh } = await useAsyncData('riwayat-beasiswa', () => getRiwayatBeasiswa());
const isLoading = useMinLoading(computed(() => pending.value && !data.value));

watch(error, (err) => {
  if (err && !hasShownError.value) {
    hasShownError.value = true;
    showToast(getApiErrorMessage(err, '✕ Gagal memuat data. Periksa koneksi Anda.'), 'error');
  }
});

const isRetrying = ref(false);
async function handleCobaLagi() {
  isRetrying.value = true;
  hasShownError.value = false;
  try {
    await refresh();
  } finally {
    isRetrying.value = false;
  }
}

const items = computed(() => data.value ?? []);
const beasiswaTahunAktif = computed(() => items.value.find((i) => i.isTahunAktif) ?? null);

const statusVerifikasi: Record<StatusVerifikasiBeasiswa, { label: string; tone: 'success' | 'danger' | 'warning' }> = {
  TERVERIFIKASI: { label: 'Terverifikasi', tone: 'success' },
  DIBATALKAN: { label: 'Dibatalkan', tone: 'danger' },
  BELUM_DIVERIFIKASI: { label: 'Belum Diverifikasi', tone: 'warning' },
};
const statusIcon = { TERVERIFIKASI: CheckCircle2, DIBATALKAN: XCircle, BELUM_DIVERIFIKASI: Clock };

function labelTanggungan(jenis: string | null) {
  if (jenis === 'penuh') return 'Penuh';
  if (jenis === 'sebagian') return 'Sebagian';
  return '-';
}

// Nilai jaminan 0 (mis. beasiswa tanggungan penuh yang tidak mencatat nominal) ditampilkan "-",
// bukan "Rp 0" yang bisa disalahartikan "tidak dapat apa-apa".
function labelJaminan(nominal: string) {
  return Number(nominal) > 0 ? formatRupiah(nominal) : '-';
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Riwayat Beasiswa" description="Daftar beasiswa yang Anda terima per tahun akademik." />

    <Card v-if="isLoading">
      <PageLoader />
    </Card>

    <Card v-else-if="error">
      <div class="flex flex-col items-center gap-3 py-8 text-center">
        <p class="text-sm text-[var(--color-danger)]">Gagal memuat riwayat beasiswa. Periksa koneksi Anda, lalu coba lagi.</p>
        <button
          type="button"
          :disabled="isRetrying"
          class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleCobaLagi"
        >
          <RefreshCw :size="12" :class="{ 'animate-spin': isRetrying }" />
          {{ isRetrying ? 'Memuat...' : 'Coba lagi' }}
        </button>
      </div>
    </Card>

    <Card v-else-if="items.length === 0">
      <EmptyState :icon="GraduationCap" title="Belum ada riwayat beasiswa" description="Anda belum tercatat sebagai penerima beasiswa di tahun akademik mana pun.">
        <template #action>
          <NuxtLink to="/" class="text-xs font-semibold text-[var(--color-primary)] hover:underline">Kembali ke Dashboard</NuxtLink>
        </template>
      </EmptyState>
    </Card>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard label="Tahun Akademik Dijamin" :value="items.length" :icon="CalendarCheck" tone="primary" />
        <StatCard
          label="Beasiswa Tahun Akademik Aktif"
          :value="beasiswaTahunAktif?.namaBeasiswa ?? 'Tidak ada'"
          :icon="Award"
          tone="accent"
        />
      </div>

      <div class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[720px] text-left text-sm">
            <thead class="border-b border-[var(--color-border)] bg-[var(--color-bg)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th class="px-4 py-3 font-semibold">Tahun Akademik</th>
                <th class="px-4 py-3 font-semibold">Nama Beasiswa</th>
                <th class="px-4 py-3 font-semibold">Tanggungan</th>
                <th class="px-4 py-3 text-right font-semibold">Nilai Jaminan</th>
                <th class="px-4 py-3 font-semibold">Verifikasi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)]">
              <tr
                v-for="item in items"
                :key="`${item.kodeTahunAkademik}-${item.namaBeasiswa}`"
                class="transition-colors hover:bg-[var(--color-bg)]"
              >
                <td class="whitespace-nowrap px-4 py-3">
                  <p class="font-medium text-[var(--color-text)]">{{ formatTahunAkademikLabel(item.kodeTahunAkademik) }}</p>
                  <Badge v-if="item.isTahunAktif" tone="primary" class="mt-1">Tahun Aktif</Badge>
                </td>
                <td class="px-4 py-3">
                  <p class="font-medium text-[var(--color-text)]">{{ item.namaBeasiswa ?? '-' }}</p>
                  <p v-if="item.namaLembaga" class="text-xs text-[var(--color-text-muted)]">{{ item.namaLembaga }}</p>
                </td>
                <td class="px-4 py-3 text-[var(--color-text)]">{{ labelTanggungan(item.jenisTanggungan) }}</td>
                <td class="px-4 py-3 text-right text-[var(--color-text)]">{{ labelJaminan(item.jumlahJaminan) }}</td>
                <td class="px-4 py-3">
                  <Badge :tone="statusVerifikasi[item.statusVerifikasi].tone">
                    <component :is="statusIcon[item.statusVerifikasi]" :size="10" class="mr-1 inline" />
                    {{ statusVerifikasi[item.statusVerifikasi].label }}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
