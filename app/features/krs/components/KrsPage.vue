<script setup lang="ts">
import { ClipboardList, FilePlus2, FileQuestion, Printer } from '@lucide/vue';
import { getRiwayatKrs, printKrs } from '../services/api';
import { formatTahunAkademikLabel } from '~/utils/tahunAkademik';
import { openPdfPreview } from '~/utils/openPdfPreview';

function formatJam(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

const { showToast } = useToast();
const hasShownError = ref(false);
// Periode terpilih disimpan di query string (?periode=...) - pola sama persis dengan KhsPage.vue,
// supaya filter di kedua halaman konsisten dan bertahan lewat navigasi. Reaktif langsung lewat
// useRoute(), tidak butuh Suspense boundary seperti versi Next.js App Router.
const route = useRoute();
const router = useRouter();
const selectedKode = computed(() => (route.query.periode as string | undefined) ?? null);

function setPeriode(value: string) {
  router.replace({ query: { ...route.query, periode: value } });
}

const { data, pending, error } = await useAsyncData('krs-riwayat', () => getRiwayatKrs());
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

let previewWindow: Window | null = null;
const isCetakPending = ref(false);

async function handleCetak() {
  // window.open() HARUS dipanggil sinkron di sini (bukan di dalam await) supaya tidak diblokir
  // popup blocker browser.
  previewWindow = window.open('', '_blank');
  isCetakPending.value = true;
  try {
    const blob = await printKrs(selectedSemester.value?.kodeTahunAkademik);
    openPdfPreview(previewWindow, blob);
  } catch (err) {
    previewWindow?.close();
    showToast(await getApiErrorMessageFromBlob(err, '✕ Gagal memuat KRS. Coba lagi.'), 'error');
  } finally {
    isCetakPending.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Kartu Rencana Studi (KRS)" description="Mata kuliah yang sudah dikontrak pada periode terpilih.">
      <template #actions>
        <button
          type="button"
          :disabled="!selectedSemester || isCetakPending"
          class="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-dark)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleCetak"
        >
          <span v-if="isCetakPending" class="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-text-muted)]/40 border-t-[var(--color-text-muted)]" />
          <Printer v-else :size="16" />
          Lihat KRS
        </button>
        <NuxtLink
          to="/krs/kontrak"
          class="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
        >
          <FilePlus2 :size="16" />
          Kontrak KRS
        </NuxtLink>
      </template>
    </PageHeader>

    <Card v-if="isLoading">
      <PageLoader />
    </Card>

    <Card v-else-if="isNotFound">
      <EmptyState
        :icon="FileQuestion"
        title="Belum ada riwayat KRS"
        description="Riwayat KRS Anda akan muncul di sini setelah Anda mengontrak mata kuliah pertama kali."
      />
    </Card>

    <Card v-else-if="error">
      <p class="py-8 text-center text-sm text-[var(--color-danger)]">
        Gagal memuat KRS. Periksa koneksi Anda, atau coba muat ulang halaman.
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
          <StatCard label="Total SKS" :value="selectedSemester.totalSks" :icon="ClipboardList" tone="primary" />
          <StatCard label="Jumlah Mata Kuliah" :value="selectedSemester.items.length" :icon="FileQuestion" tone="neutral" />
        </div>

        <div class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <div v-if="selectedSemester.items.length === 0" class="px-6 py-16 text-center text-sm text-[var(--color-text-muted)]">
            Belum ada mata kuliah yang dikontrak pada periode ini.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[900px] text-left text-sm">
              <thead class="border-b border-[var(--color-border)] bg-[var(--color-bg)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <tr>
                  <th class="px-4 py-3 font-semibold">Kode</th>
                  <th class="px-4 py-3 font-semibold">Mata Kuliah</th>
                  <th class="px-4 py-3 text-right font-semibold">SKS</th>
                  <th class="px-4 py-3 font-semibold">Hari</th>
                  <th class="px-4 py-3 font-semibold">Jam</th>
                  <th class="px-4 py-3 font-semibold">Ruang</th>
                  <th class="min-w-[220px] px-4 py-3 font-semibold">Dosen</th>
                  <th class="px-4 py-3 font-semibold">Status PA</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border)]">
                <tr v-for="(item, idx) in selectedSemester.items" :key="idx" class="transition-colors hover:bg-[var(--color-bg)]">
                  <td class="whitespace-nowrap px-4 py-3 font-medium text-[var(--color-text)]">{{ item.kodeMataKuliah ?? '-' }}</td>
                  <td class="px-4 py-3 text-[var(--color-text)]">{{ item.namaMataKuliah ?? 'Mata kuliah tidak diketahui' }}</td>
                  <td class="px-4 py-3 text-right text-[var(--color-text)]">{{ item.sks ?? '-' }}</td>
                  <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ item.namaHari ?? '-' }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">
                    {{ item.namaHari && formatJam(item.jamMulai) && formatJam(item.jamSelesai) ? `${formatJam(item.jamMulai)}-${formatJam(item.jamSelesai)}` : '-' }}
                  </td>
                  <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ item.namaRuang ?? (item.ruangId ? `Ruang #${item.ruangId}` : '-') }}</td>
                  <td class="min-w-[220px] px-4 py-3 text-[var(--color-text-muted)]">{{ item.namaDosen ?? (item.dosenId ? `Dosen ID ${item.dosenId}` : '-') }}</td>
                  <td class="px-4 py-3">
                    <Badge :tone="item.persetujuanPa === 'Y' ? 'success' : 'warning'">
                      {{ item.persetujuanPa === 'Y' ? 'Disetujui PA' : 'Menunggu PA' }}
                    </Badge>
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
