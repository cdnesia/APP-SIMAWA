<script setup lang="ts">
import { Award, BarChart3, ClipboardCheck, FileQuestion, Lock, Printer } from '@lucide/vue';
import { getRiwayatKhs, printKhs } from '../services/api';
import type { KhsMatakuliah } from '../types';
import { formatNilaiKomponen, getNilaiHurufTone } from '../lib/nilai';
import { formatTahunAkademikLabel } from '~/utils/tahunAkademik';
import { openPdfPreview } from '~/utils/openPdfPreview';

const KOMPONEN_LABELS: { key: keyof KhsMatakuliah; label: string }[] = [
  { key: 'nilaiSikap', label: 'Sikap' },
  { key: 'nilaiKuis', label: 'Kuis' },
  { key: 'nilaiUts', label: 'UTS' },
  { key: 'nilaiKu', label: 'K. Tugas' },
  { key: 'nilaiKh', label: 'Kehadiran' },
  { key: 'nilaiUas', label: 'UAS' },
];

const { showToast } = useToast();
const hasShownError = ref(false);
// Periode terpilih disimpan di query string (?periode=...) - supaya kalau mahasiswa pindah ke
// halaman Isi EDOM lalu simpan/batal dan kembali, filter tetap di periode yang sama (tidak reset
// ke periode terbaru).
const route = useRoute();
const router = useRouter();
const selectedKode = computed(() => (route.query.periode as string | undefined) ?? null);

function setPeriode(value: string) {
  router.replace({ query: { ...route.query, periode: value } });
}

const { data, pending, error } = await useAsyncData('khs-riwayat', () => getRiwayatKhs());
const isLoading = useMinLoading(pending);

const isNotFound = computed(() => (error.value as { statusCode?: number } | null)?.statusCode === 404);
const semesterList = computed(() => data.value?.semesterList ?? []);

watch(error, (err) => {
  if (err && !isNotFound.value && !hasShownError.value) {
    hasShownError.value = true;
    showToast(getApiErrorMessage(err, 'Gagal memuat data. Periksa koneksi Anda.'), 'error');
  }
});

// Default pilihan: periode paling baru dari riwayat (cuma kalau belum ada di query string) -
// DIHITUNG LANGSUNG di computed, BUKAN lewat router.replace() saat mount. router.replace()
// bersifat asinkron dan tidak selesai sebelum SSR mengambil snapshot HTML pertama, jadi kalau
// default periode digantungkan ke situ, render pertama (SSR maupun sebelum navigasi client
// selesai) selalu melihat selectedKode masih null - tabel jadi kosong sampai ada interaksi user.
const selectedSemester = computed(() => {
  if (semesterList.value.length === 0) return undefined;
  if (selectedKode.value === null) return semesterList.value[semesterList.value.length - 1];
  return semesterList.value.find((s) => s.kodeTahunAkademik === selectedKode.value);
});

// Sama seperti gerbang cetak di backend (print.service.ts::cetakKhsPdf) - dicek juga di FE
// supaya tombol bisa dinonaktifkan duluan dengan alasan jelas, bukan baru tahu setelah klik.
// Mata kuliah yang belum punya nilai sama sekali (dosen belum input) TIDAK wajib isi EDOM dulu -
// itu beda kasus dari "sudah dinilai tapi EDOM belum diisi".
function siapDicetak(item: KhsMatakuliah) {
  if (!item.adaJadwal) return true;
  const adaNilai = item.nilaiHuruf !== null || item.nilaiTerkunci;
  return adaNilai && item.sudahEdom;
}

const bolehCetak = computed(
  () => Boolean(selectedSemester.value && selectedSemester.value.items.length > 0 && selectedSemester.value.items.every(siapDicetak)),
);

let previewWindow: Window | null = null;
const isCetakPending = ref(false);

async function handleCetak() {
  previewWindow = window.open('', '_blank');
  isCetakPending.value = true;
  try {
    const blob = await printKhs(selectedSemester.value?.kodeTahunAkademik);
    openPdfPreview(previewWindow, blob);
  } catch (err) {
    previewWindow?.close();
    showToast(await getApiErrorMessageFromBlob(err, '✕ Gagal memuat KHS. Coba lagi.'), 'error');
  } finally {
    isCetakPending.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Kartu Hasil Studi (KHS)" description="Nilai mata kuliah pada periode terpilih.">
      <template #actions>
        <button
          type="button"
          :disabled="!bolehCetak || isCetakPending"
          :title="!bolehCetak && selectedSemester ? 'Lengkapi nilai dan EDOM semua mata kuliah dulu untuk bisa mencetak' : undefined"
          class="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-dark)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleCetak"
        >
          <span v-if="isCetakPending" class="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-text-muted)]/40 border-t-[var(--color-text-muted)]" />
          <Printer v-else :size="16" />
          Lihat KHS
        </button>
      </template>
    </PageHeader>

    <Card v-if="isLoading">
      <PageLoader />
    </Card>

    <Card v-else-if="isNotFound">
      <EmptyState
        :icon="FileQuestion"
        title="Belum ada riwayat akademik"
        description="KHS Anda akan muncul di sini setelah Anda memiliki riwayat KRS dan nilai pada semester berjalan."
      />
    </Card>

    <Card v-else-if="error">
      <p class="py-8 text-center text-sm text-[var(--color-danger)]">
        Gagal memuat KHS. Periksa koneksi Anda, atau coba muat ulang halaman.
      </p>
    </Card>

    <template v-else-if="semesterList.length > 0">
      <div class="w-full sm:w-72">
        <label class="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Periode</label>
        <Select2
          :model-value="selectedSemester?.kodeTahunAkademik ?? ''"
          :options="semesterList.map((s, idx) => ({ value: s.kodeTahunAkademik, label: `Semester ${idx + 1} - ${formatTahunAkademikLabel(s.kodeTahunAkademik)}` }))"
          @update:model-value="setPeriode"
        />
      </div>

      <template v-if="selectedSemester">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <StatCard label="Total SKS" :value="selectedSemester.sksSemester ?? 0" :icon="BarChart3" tone="primary" />
          <StatCard label="IPS" :value="selectedSemester.ips ?? '-'" :icon="Award" tone="accent" />
        </div>

        <div v-if="!bolehCetak && selectedSemester.items.length > 0" class="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-3 text-sm text-[var(--color-warning)]">
          {{ selectedSemester.items.filter(siapDicetak).length }} dari {{ selectedSemester.items.length }} mata kuliah sudah dinilai &amp; mengisi EDOM — lengkapi semua untuk bisa mencetak KHS.
        </div>

        <div class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <div v-if="selectedSemester.items.length === 0" class="px-6 py-16 text-center text-sm text-[var(--color-text-muted)]">
            Belum ada nilai pada periode ini.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[820px] text-left text-sm">
              <thead class="border-b border-[var(--color-border)] bg-[var(--color-bg)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <tr>
                  <th class="px-4 py-3 font-semibold">Kode</th>
                  <th class="px-4 py-3 font-semibold">Mata Kuliah</th>
                  <th class="px-4 py-3 text-right font-semibold">SKS</th>
                  <th class="px-4 py-3 font-semibold">Nilai</th>
                  <th class="px-4 py-3 font-semibold">Status</th>
                  <th class="px-4 py-3 font-semibold">EDOM</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border)]">
                <tr v-for="(item, idx) in selectedSemester.items" :key="idx" class="transition-colors hover:bg-[var(--color-bg)]">
                  <td class="whitespace-nowrap px-4 py-3 font-medium text-[var(--color-text)]">{{ item.kodeMataKuliah ?? '-' }}</td>
                  <td class="px-4 py-3 text-[var(--color-text)]">
                    <p>{{ item.namaMataKuliah ?? 'Mata kuliah tidak diketahui' }}</p>
                    <NuxtLink
                      v-if="item.nilaiTerkunci"
                      :to="`/edom/isi/${item.jadwalId}?periode=${selectedSemester?.kodeTahunAkademik}`"
                      class="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-[var(--color-warning)] hover:underline"
                    >
                      <Lock :size="10" />
                      Isi EDOM untuk melihat rincian nilai
                    </NuxtLink>
                    <p v-else class="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-[var(--color-text-muted)]">
                      <span v-for="komponen in KOMPONEN_LABELS" :key="komponen.key">
                        {{ komponen.label }} {{ formatNilaiKomponen(item[komponen.key] as string | null) }}
                      </span>
                    </p>
                  </td>
                  <td class="px-4 py-3 text-right text-[var(--color-text)]">{{ item.sks ?? '-' }}</td>
                  <td class="px-4 py-3">
                    <Badge v-if="item.nilaiTerkunci" tone="neutral"><Lock :size="10" class="mr-1 inline" />Terkunci</Badge>
                    <Badge v-else :tone="getNilaiHurufTone(item.nilaiHuruf)">{{ item.nilaiHuruf ?? 'Belum dinilai' }}</Badge>
                  </td>
                  <td class="px-4 py-3">
                    <span v-if="item.nilaiTerkunci" class="text-xs text-[var(--color-text-muted)]">-</span>
                    <Badge v-else :tone="item.lulus === 'Y' ? 'success' : 'danger'">{{ item.lulus === 'Y' ? 'Lulus' : 'Belum Lulus' }}</Badge>
                  </td>
                  <td class="px-4 py-3">
                    <span v-if="item.nilaiHuruf === null && !item.nilaiTerkunci" class="text-xs text-[var(--color-text-muted)]">Belum ada nilai</span>
                    <span v-else-if="!item.adaJadwal" class="text-xs text-[var(--color-text-muted)]">-</span>
                    <Badge v-else-if="item.sudahEdom" tone="success">Sudah Isi</Badge>
                    <NuxtLink
                      v-else
                      :to="`/edom/isi/${item.jadwalId}?periode=${selectedSemester?.kodeTahunAkademik}`"
                      class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
                    >
                      <ClipboardCheck :size="14" />
                      Isi EDOM
                    </NuxtLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>

    <Card v-else>
      <EmptyState
        :icon="FileQuestion"
        title="Belum ada periode untuk ditampilkan"
        description="Data tahun masuk atau tahun akademik aktif Anda belum lengkap. Hubungi bagian akademik jika ini terus terjadi."
      />
    </Card>
  </div>
</template>
