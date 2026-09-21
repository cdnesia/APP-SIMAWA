<script setup lang="ts">
import { ArrowLeft, CheckCircle2, Clock, GraduationCap, Layers, Lock, ShieldAlert, XCircle } from '@lucide/vue';
import { daftarKegiatanMahasiswa, getKegiatanMahasiswa } from '../services/api';
import { getKegiatanConfigBySlug, type KegiatanConfig } from '../config';
import { formatRupiah } from '~/utils/format';
import { formatTahunAkademikLabel } from '~/utils/tahunAkademik';

// Alasan ketidaksesuaian prodi/angkatan/kelas dari backend (kegiatanMahasiswa.service.ts) -
// kegiatan dengan alasan ini disembunyikan total di sini (bukan cuma ditandai "tidak memenuhi
// syarat"), karena kegiatan itu memang bukan untuk mahasiswa ini sama sekali, bukan soal belum
// lulus syarat akademik (SKS/semester/nilai D).
const ALASAN_BUKAN_UNTUK_SAYA = new Set([
  'Program studi Anda tidak termasuk yang dibuka untuk kegiatan ini',
  'Angkatan Anda tidak termasuk yang dibuka untuk kegiatan ini',
  'Kelas perkuliahan Anda tidak termasuk yang dibuka untuk kegiatan ini',
]);

// Halaman pendaftaran (pilih & baca syarat) - satu route dinamis dipakai untuk KKN, PKL, Seminar
// Proposal, dan Sidang Tugas Akhir sekaligus (lihat features/kegiatan-mahasiswa/config.ts).
const route = useRoute();
const configOrNull = getKegiatanConfigBySlug(route.params.tipe as string);
if (!configOrNull) {
  throw createError({ statusCode: 404, statusMessage: 'Jenis kegiatan tidak ditemukan' });
}
// Binding baru dengan tipe non-null eksplisit - narrowing `if(!x) throw` TIDAK terbawa ke dalam
// closure (mis. handleDaftar di bawah) walau `config` sudah pasti const, itu batasan control
// flow analysis TypeScript di seberang function boundary.
const config: KegiatanConfig = configOrNull;

const { showToast } = useToast();
const hasShownError = ref(false);

const { data, pending, error, refresh } = await useAsyncData('kegiatan-mahasiswa', () => getKegiatanMahasiswa());
// `pending && !data` PENTING (lihat komentar di template) - dibungkus useMinLoading() SETELAH
// dikombinasikan, bukan pending mentah, supaya refresh() pasca-daftar (yang bukan loading
// pertama) tidak ikut kena paksaan tampil minimal 5 detik.
const isLoading = useMinLoading(computed(() => pending.value && !data.value));

watch(error, (err) => {
  if (err && !hasShownError.value) {
    hasShownError.value = true;
    showToast(getApiErrorMessage(err, '✕ Gagal memuat data. Periksa koneksi Anda.'), 'error');
  }
});

const pendingId = ref<number | null>(null);

async function handleDaftar(id: number) {
  pendingId.value = id;
  try {
    await daftarKegiatanMahasiswa(id);
    showToast(`✓ Berhasil mendaftar ${config.label}`, 'success');
    await refresh();
  } catch (err) {
    showToast(getApiErrorMessage(err, `✕ Gagal mendaftar ${config.label}. Coba lagi.`), 'error');
  } finally {
    pendingId.value = null;
  }
}

const items = computed(() =>
  (data.value?.items ?? []).filter((item) => item.tipe === config.tipe && !ALASAN_BUKAN_UNTUK_SAYA.has(item.alasanTidakMemenuhi ?? '')),
);
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader :title="`Daftar ${config.label}`" :description="`Pilih ${config.label} dan baca syaratnya sebelum mendaftar.`">
      <template #actions>
        <NuxtLink
          :to="config.path"
          class="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-dark)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
        >
          <ArrowLeft :size="16" />
          Riwayat Pendaftaran
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- `pending && !data` (lihat isLoading di script) PENTING - `pending` juga jadi true tiap
         kali refresh() dipanggil setelah daftar (lihat handleDaftar), bukan cuma saat load
         pertama. Tanpa syarat ini, seluruh grid ikut disembunyikan tiap klik Daftar, padahal
         loading per-aksi seharusnya cukup di tombolnya sendiri (pendingId). -->
    <Card v-if="isLoading">
      <PageLoader />
    </Card>

    <Card v-else-if="error">
      <p class="py-8 text-center text-sm text-[var(--color-danger)]">
        Gagal memuat data {{ config.label }}. Periksa koneksi Anda, atau coba muat ulang halaman.
      </p>
    </Card>

    <Card v-else-if="items.length === 0">
      <EmptyState :icon="config.icon" :title="`Belum ada ${config.label}`" :description="`${config.label} untuk program studi Anda belum dipublikasikan oleh akademik. Coba cek kembali nanti.`" />
    </Card>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="item in items" :key="item.id" class="flex flex-col">
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-[var(--color-text)]">{{ item.namaKegiatan }}</h3>
          <div class="mt-1.5">
            <Badge v-if="item.sudahDaftar" tone="success"><CheckCircle2 :size="12" class="mr-1 inline" />Sudah Terdaftar</Badge>
            <Badge v-else-if="!item.periodePendaftaranDibuka" tone="neutral"><Lock :size="12" class="mr-1 inline" />Periode Ditutup</Badge>
            <Badge v-else-if="!item.memenuhiSyarat" tone="danger"><XCircle :size="12" class="mr-1 inline" />Belum Memenuhi Syarat</Badge>
            <Badge v-else tone="primary">Bisa Didaftar</Badge>
          </div>

          <p class="mt-3 text-base font-semibold text-[var(--color-text)]">{{ formatRupiah(item.biayaPendaftaran) }}</p>

          <div class="mt-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Syarat pendaftaran</p>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <div class="flex items-center gap-2 rounded-lg bg-[var(--color-bg)] px-3 py-2">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <GraduationCap :size="15" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Min. SKS Lulus</p>
                  <p class="truncate text-sm font-semibold text-[var(--color-text)]">{{ item.minimalSks }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 rounded-lg bg-[var(--color-bg)] px-3 py-2">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <Layers :size="15" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Min. Semester</p>
                  <p class="truncate text-sm font-semibold text-[var(--color-text)]">{{ item.minimalSemester }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 rounded-lg bg-[var(--color-bg)] px-3 py-2">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <ShieldAlert :size="15" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Maks. Nilai D</p>
                  <p class="truncate text-sm font-semibold text-[var(--color-text)]">{{ item.maksimalNilaiD }}</p>
                </div>
              </div>
              <div v-if="item.kodeTahunAkademikPeriode" class="flex items-center gap-2 rounded-lg bg-[var(--color-bg)] px-3 py-2">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <Clock :size="15" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Periode</p>
                  <p class="truncate text-sm font-semibold text-[var(--color-text)]">{{ formatTahunAkademikLabel(item.kodeTahunAkademikPeriode) }}</p>
                </div>
              </div>
            </div>
          </div>

          <p v-if="item.alasanTidakMemenuhi" class="mt-3 rounded-lg bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
            {{ item.alasanTidakMemenuhi }}
          </p>
        </div>

        <button
          type="button"
          :disabled="!(item.memenuhiSyarat && item.periodePendaftaranDibuka && !item.sudahDaftar) || pendingId !== null"
          class="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          @click="handleDaftar(item.id)"
        >
          <span v-if="pendingId === item.id" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          {{ item.sudahDaftar ? 'Sudah Terdaftar' : 'Daftar' }}
        </button>
      </Card>
    </div>
  </div>
</template>
