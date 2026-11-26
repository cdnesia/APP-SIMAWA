<script setup lang="ts">
import { Award, BarChart3, BookOpen, FileQuestion, Printer } from '@lucide/vue';
import { getTranskrip, printTranskrip } from '../services/api';
import { hitungMutu, hitungRingkasan, kunciBaris, pilihNilaiTerbaik } from '../lib/nilaiTerbaik';
import { getNilaiHurufTone } from '~/features/khs/lib/nilai';
import { formatTahunAkademikLabel } from '~/utils/tahunAkademik';
import { openPdfPreview } from '~/utils/openPdfPreview';

type Tampilan = 'terbaik' | 'semua';

const { showToast } = useToast();
const hasShownError = ref(false);

const { data, pending, error } = await useAsyncData('transkrip', () => getTranskrip());
const isLoading = useMinLoading(pending);

const isNotFound = computed(() => (error.value as { statusCode?: number } | null)?.statusCode === 404);
const semesterList = computed(() => data.value?.semester ?? []);

watch(error, (err) => {
  if (err && !isNotFound.value && !hasShownError.value) {
    hasShownError.value = true;
    showToast(getApiErrorMessage(err, '✕ Gagal memuat data. Periksa koneksi Anda.'), 'error');
  }
});

// Default "nilai terbaik" = sama persis dengan PDF transkrip sementara. "Semua pengambilan" menampilkan riwayat
// lengkap; pengambilan yang kalah ditandai "Diulang" (tidak dihitung ke IPK).
const tampilan = ref<Tampilan>('terbaik');
const OPSI_TAMPILAN = [
  { value: 'terbaik', label: 'Nilai terbaik (sesuai cetakan)' },
  { value: 'semua', label: 'Semua pengambilan' },
];

const terpilih = computed(() => pilihNilaiTerbaik(semesterList.value));
const ringkasan = computed(() => hitungRingkasan(semesterList.value, terpilih.value));
const jumlahDiulang = computed(() => semesterList.value.reduce((n, s) => n + s.matakuliah.length, 0) - terpilih.value.size);

const semesterTampil = computed(() =>
  semesterList.value
    .map((s, iSemester) => ({
      ...s,
      baris: s.matakuliah
        .map((mk, iMk) => ({ mk, dipakai: terpilih.value.has(kunciBaris(iSemester, iMk)) }))
        .filter((b) => tampilan.value === 'semua' || b.dipakai),
    }))
    .filter((s) => s.baris.length > 0),
);

let previewWindow: Window | null = null;
const isCetakPending = ref(false);

async function handleCetak() {
  previewWindow = window.open('', '_blank');
  isCetakPending.value = true;
  try {
    const blob = await printTranskrip();
    openPdfPreview(previewWindow, blob);
  } catch (err) {
    previewWindow?.close();
    showToast(await getApiErrorMessageFromBlob(err, '✕ Gagal memuat transkrip. Coba lagi.'), 'error');
  } finally {
    isCetakPending.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Transkrip Nilai" description="Seluruh nilai mata kuliah yang pernah Anda ambil.">
      <template #actions>
        <button
          type="button"
          :disabled="isLoading || !!error || semesterList.length === 0 || isCetakPending"
          class="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleCetak"
        >
          <span v-if="isCetakPending" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          <Printer v-else :size="16" />
          Cetak Transkrip Sementara
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
        description="Transkrip Anda akan muncul di sini setelah Anda memiliki riwayat KRS dan nilai."
      />
    </Card>

    <Card v-else-if="error">
      <p class="py-8 text-center text-sm text-[var(--color-danger)]">
        Gagal memuat transkrip. Periksa koneksi Anda, atau coba muat ulang halaman.
      </p>
    </Card>

    <Card v-else-if="semesterList.length === 0">
      <EmptyState
        :icon="FileQuestion"
        title="Belum ada mata kuliah"
        description="Anda belum pernah mengontrak mata kuliah. Kontrak mata kuliah lewat menu KRS."
      />
      <div class="mt-4 flex justify-center">
        <NuxtLink to="/krs" class="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)]">Buka KRS</NuxtLink>
      </div>
    </Card>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="IP Kumulatif" :value="ringkasan.ipk ?? '-'" :icon="Award" tone="accent" />
        <StatCard label="Total SKS (dinilai)" :value="ringkasan.sksDinilai" :icon="BarChart3" tone="primary" />
        <StatCard label="Jumlah Mata Kuliah" :value="ringkasan.jumlahMataKuliah" :icon="BookOpen" />
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="w-full sm:w-72">
          <label class="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Tampilkan</label>
          <Select2 :model-value="tampilan" :options="OPSI_TAMPILAN" @update:model-value="(v) => (tampilan = v as Tampilan)" />
        </div>
        <p class="text-xs text-[var(--color-text-muted)] sm:max-w-md sm:text-right">
          Mata kuliah yang diambil lebih dari sekali dihitung dengan nilai terbaik<span v-if="jumlahDiulang > 0"> ({{ jumlahDiulang }} pengambilan diulang)</span>. IPK &amp; SKS dihitung dari mata kuliah yang sudah dinilai.
        </p>
      </div>

      <section
        v-for="s in semesterTampil"
        :key="s.kodeTahunAkademik"
        class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"
      >
        <header class="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
          <h2 class="text-sm font-semibold text-[var(--color-text)]">{{ s.namaTahunAkademik ?? formatTahunAkademikLabel(s.kodeTahunAkademik) }}</h2>
        </header>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] text-left text-sm">
            <thead class="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th class="px-4 py-3 font-semibold">Mata Kuliah</th>
                <th class="px-4 py-3 text-right font-semibold">SKS</th>
                <th class="px-4 py-3 font-semibold">Nilai</th>
                <th class="px-4 py-3 text-right font-semibold">Bobot</th>
                <th class="px-4 py-3 text-right font-semibold">Mutu</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)]">
              <tr
                v-for="(b, idx) in s.baris"
                :key="idx"
                :class="['transition-colors hover:bg-[var(--color-bg)]', b.dipakai ? '' : 'opacity-60']"
              >
                <td class="px-4 py-3">
                  <p class="font-semibold text-[var(--color-text)]">{{ b.mk.namaMataKuliah ?? 'Mata kuliah tidak diketahui' }}</p>
                  <div class="mt-1 flex flex-wrap items-center gap-1.5">
                    <span class="rounded bg-[var(--color-bg)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text-muted)]">{{ b.mk.kodeMataKuliah ?? '-' }}</span>
                    <Badge v-if="!b.dipakai" tone="neutral">Diulang</Badge>
                  </div>
                </td>
                <td class="px-4 py-3 text-right text-[var(--color-text)]">{{ b.mk.sks ?? '-' }}</td>
                <td class="px-4 py-3">
                  <Badge :tone="getNilaiHurufTone(b.mk.nilaiHuruf)">
                    <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />{{ b.mk.nilaiHuruf ?? 'Belum dinilai' }}
                  </Badge>
                  <span v-if="b.mk.nilaiAngka !== null" class="ml-2 text-xs text-[var(--color-text-muted)]">{{ Number(b.mk.nilaiAngka) }}</span>
                </td>
                <td class="px-4 py-3 text-right text-[var(--color-text)]">{{ b.mk.nilaiBobot !== null ? Number(b.mk.nilaiBobot) : '-' }}</td>
                <td class="px-4 py-3 text-right text-[var(--color-text)]">{{ hitungMutu(b.mk.sks, b.mk.nilaiBobot) ?? '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
