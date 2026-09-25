<script setup lang="ts">
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, Plus, Receipt, RefreshCw, WifiOff, X } from '@lucide/vue';
import { batalkanKrs, getJadwalTersedia, kontrakKrs } from '../services/api';
import type { JadwalTersediaItem } from '../types';
import { getRincianTagihanAktif } from '~/features/tagihan/services/api';
import { formatTahunAkademikLabel } from '~/utils/tahunAkademik';

function formatJam(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

// Kelompokkan berdasarkan semester kurikulum mata kuliah (1, 3, 5, ...) - standar tampilan KRS
// di SIAKAD: mata kuliah dikelompokkan per semester program studi.
function groupBySemester(items: JadwalTersediaItem[]) {
  const groups = new Map<number, JadwalTersediaItem[]>();
  const lainnya: JadwalTersediaItem[] = [];
  for (const item of items) {
    if (item.semesterMataKuliah === null) {
      lainnya.push(item);
      continue;
    }
    const list = groups.get(item.semesterMataKuliah) ?? [];
    list.push(item);
    groups.set(item.semesterMataKuliah, list);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => a - b);
  if (lainnya.length > 0) sorted.push([0, lainnya]);
  return sorted;
}

const { showToast } = useToast();
const hasShownError = ref(false);
const hasShownStatusError = ref(false);

// Cek dulu status kelayakan (syarat SPP TA aktif minimal 60%, dikecualikan penerima beasiswa penuh terverifikasi)
// SEBELUM memuat jadwal tersedia - kalau belum lolos, jadwal tidak usah dimuat sama sekali.
// Backend POST /krs tetap menolak juga (sumber kebenaran), tapi alert di halaman ini memberi
// alasan yang jelas di muka, bukan cuma tabel kosong atau toast error setelah mencoba klik.
const {
  data: statusSpp,
  pending: statusPending,
  error: statusError,
  refresh: refreshStatus,
} = await useAsyncData('krs-status-spp', () => getRincianTagihanAktif({ kontrakKrs: true }));
const isStatusLoading = useMinLoading(statusPending);

watch(statusError, (err) => {
  if (err && !hasShownStatusError.value) {
    hasShownStatusError.value = true;
    showToast(getApiErrorMessage(err, 'Gagal memuat status pembayaran SPP.'), 'error');
  }
});

const bolehKontrak = computed(() => statusSpp.value?.bolehKontrakKrs ?? false);

// Penerima beasiswa penuh terverifikasi: tagihan SPP TA aktif sudah dihapus server di pengecekan
// status di atas (?kontrakKrs=1) - di sini cuma kasih tahu mahasiswa. Toast di onMounted karena
// data bisa datang dari SSR (toast container cuma ada di browser).
function tampilkanToastSppDihapus() {
  if ((statusSpp.value?.jumlahSppDihapus ?? 0) > 0) {
    showToast('✓ Tagihan SPP dihapus karena Anda penerima beasiswa penuh', 'success');
  }
}
onMounted(tampilkanToastSppDihapus);

const { data, pending, error, refresh } = await useAsyncData('krs-jadwal-tersedia', () =>
  bolehKontrak.value ? getJadwalTersedia() : Promise.resolve(null),
);

watch(error, (err) => {
  if (err && !hasShownError.value) {
    hasShownError.value = true;
    showToast(getApiErrorMessage(err, 'Gagal memuat jadwal yang tersedia.'), 'error');
  }
});

// `pending && !data` PENTING (lihat komentar di template) - dibungkus useMinLoading() SETELAH
// dikombinasikan, bukan pending mentah, supaya refresh() pasca-kontrak/batal (yang bukan loading
// pertama) tidak ikut kena paksaan tampil minimal 5 detik.
const isJadwalLoading = useMinLoading(computed(() => pending.value && !data.value));

// Pengecekan status GAGAL (bukan "belum bayar") - mis. SERVICE-PUBLIC tidak bisa dihubungi atau
// penghapusan SPP penerima beasiswa penuh gagal. Dibedakan dari panel "belum bisa kontrak" supaya
// mahasiswa tidak disuruh melunasi SPP gara-gara gangguan sistem.
const isRetryingStatus = ref(false);
async function handleCobaLagiStatus() {
  isRetryingStatus.value = true;
  hasShownStatusError.value = false;
  try {
    await refreshStatus();
    if (!statusError.value) {
      tampilkanToastSppDihapus();
      // Jadwal dimuat ulang karena fetch pertamanya mengembalikan null saat status masih gagal.
      if (bolehKontrak.value) await refresh();
    }
  } finally {
    isRetryingStatus.value = false;
  }
}

const pendingKontrakId = ref<string | null>(null);
const pendingBatalkanId = ref<string | null>(null);

async function handleKontrak(jadwalId: string) {
  pendingKontrakId.value = jadwalId;
  try {
    await kontrakKrs([jadwalId]);
    showToast('✓ Mata kuliah berhasil dikontrak', 'success');
    await refresh();
  } catch (err) {
    showToast(getApiErrorMessage(err, '✕ Gagal mengontrak mata kuliah. Coba lagi.'), 'error');
  } finally {
    pendingKontrakId.value = null;
  }
}

async function handleBatalkan(jadwalId: string) {
  pendingBatalkanId.value = jadwalId;
  try {
    await batalkanKrs(jadwalId);
    showToast('✓ Kontrak mata kuliah berhasil dibatalkan', 'success');
    await refresh();
  } catch (err) {
    showToast(getApiErrorMessage(err, '✕ Gagal membatalkan kontrak. Coba lagi.'), 'error');
  } finally {
    pendingBatalkanId.value = null;
  }
}

const items = computed(() => data.value?.items ?? []);
const totalSksDikontrak = computed(() => items.value.filter((i) => i.sudahDikontrak).reduce((sum, i) => sum + (i.sks ?? 0), 0));
const jumlahDikontrak = computed(() => items.value.filter((i) => i.sudahDikontrak).length);
const grouped = computed(() => groupBySemester(items.value));
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="Kontrak KRS"
      :description="
        data
          ? `Kontrak mata kuliah untuk periode ${formatTahunAkademikLabel(data.kodeTahunAkademik)}.`
          : 'Kontrak mata kuliah untuk tahun akademik yang sedang aktif.'
      "
    >
      <template #actions>
        <NuxtLink
          to="/krs"
          class="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-dark)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
        >
          <ArrowLeft :size="16" />
          Lihat KRS
        </NuxtLink>
      </template>
    </PageHeader>

    <div v-if="isStatusLoading" class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <PageLoader />
    </div>

    <div
      v-else-if="statusError"
      class="flex items-start gap-3 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-5"
    >
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
        <WifiOff :size="18" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-[var(--color-text)]">Status pembayaran belum bisa dicek</p>
        <p class="mt-0.5 text-sm text-[var(--color-text-muted)]">
          Terjadi gangguan saat memeriksa status pembayaran Anda. Silakan coba lagi beberapa saat lagi.
        </p>
        <button
          type="button"
          :disabled="isRetryingStatus"
          class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleCobaLagiStatus"
        >
          <RefreshCw :size="12" :class="{ 'animate-spin': isRetryingStatus }" />
          {{ isRetryingStatus ? 'Memeriksa...' : 'Coba lagi' }}
        </button>
      </div>
    </div>

    <div
      v-else-if="!bolehKontrak"
      class="flex items-start gap-3 rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-5"
    >
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
        <AlertTriangle :size="18" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-[var(--color-text)]">Anda belum bisa kontrak KRS</p>
        <p class="mt-0.5 text-sm text-[var(--color-text-muted)]">
          Anda belum membayar SPP tahun akademik ini<template v-if="statusSpp"> (saat ini <strong class="text-[var(--color-text)]">{{ statusSpp.persentaseSpp }}%</strong>)</template>.
          Lunasi SPP dulu agar jadwal yang tersedia untuk dikontrak bisa muncul di sini.
        </p>
        <NuxtLink to="/tagihan" class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline">
          <Receipt :size="12" />
          Lihat & bayar tagihan
        </NuxtLink>
      </div>
    </div>

    <template v-else>
      <!-- `pending && !data` (lihat isJadwalLoading di script) PENTING - `pending` juga jadi true
           tiap kali refresh() dipanggil setelah kontrak/batalkan (lihat handleKontrak/
           handleBatalkan), bukan cuma saat load pertama. Tanpa syarat ini, seluruh tabel ikut
           disembunyikan tiap klik tombol, padahal loading per-aksi seharusnya cukup di tombolnya
           sendiri (pendingKontrakId/pendingBatalkanId) - data lama tetap ditampilkan sampai
           refresh selesai. -->
      <div v-if="isJadwalLoading" class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <PageLoader />
      </div>

      <div v-if="error" class="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4 text-sm text-[var(--color-danger)]">
        Gagal memuat jadwal. Periksa koneksi Anda, atau coba muat ulang halaman.
      </div>
    </template>

    <template v-if="data">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatCard label="Total SKS Dikontrak" :value="totalSksDikontrak" :icon="ClipboardList" tone="primary" />
        <StatCard label="Mata Kuliah Dikontrak" :value="jumlahDikontrak" :icon="CheckCircle2" tone="accent" />
      </div>

      <div v-if="items.length === 0" class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
        <EmptyState
          :icon="CalendarClock"
          title="Jadwal belum tersedia"
          description="Jadwal kuliah untuk tahun akademik ini belum dipublikasikan oleh akademik/prodi. Coba cek kembali nanti."
        />
      </div>

      <div class="flex flex-col gap-4">
        <div v-for="[sem, groupItems] in grouped" :key="sem" class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <div class="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
            <h3 class="text-sm font-semibold text-[var(--color-text)]">{{ sem === 0 ? 'Semester Lainnya' : `Semester ${sem}` }}</h3>
            <span class="text-xs text-[var(--color-text-muted)]">{{ groupItems.length }} mata kuliah</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[820px] text-left text-sm">
              <thead class="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <tr>
                  <th class="px-4 py-3 font-semibold">Kode</th>
                  <th class="px-4 py-3 font-semibold">Mata Kuliah</th>
                  <th class="px-4 py-3 text-right font-semibold">SKS</th>
                  <th class="px-4 py-3 font-semibold">Hari</th>
                  <th class="px-4 py-3 font-semibold">Jam</th>
                  <th class="px-4 py-3 font-semibold">Ruang</th>
                  <th class="px-4 py-3 font-semibold">Dosen</th>
                  <th class="w-32 px-4 py-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border)]">
                <tr
                  v-for="item in groupItems"
                  :key="item.jadwalId"
                  :class="['transition-colors', item.sudahDikontrak ? 'bg-[var(--color-success)]/5' : 'hover:bg-[var(--color-bg)]']"
                >
                  <td class="whitespace-nowrap px-4 py-3 font-medium text-[var(--color-text)]">{{ item.kodeMataKuliah ?? '-' }}</td>
                  <td class="px-4 py-3 text-[var(--color-text)]">
                    {{ item.namaMataKuliah ?? 'Mata kuliah tidak diketahui' }}
                    <span v-if="item.kelompok" class="ml-1.5 text-xs text-[var(--color-text-muted)]">&middot; {{ item.kelompok }}</span>
                  </td>
                  <td class="px-4 py-3 text-right text-[var(--color-text)]">{{ item.sks ?? '-' }}</td>
                  <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ item.namaHari ?? '-' }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">
                    {{ item.namaHari && formatJam(item.jamMulai) && formatJam(item.jamSelesai) ? `${formatJam(item.jamMulai)}-${formatJam(item.jamSelesai)}` : '-' }}
                  </td>
                  <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ item.namaRuang ?? (item.ruangId ? `Ruang #${item.ruangId}` : '-') }}</td>
                  <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ item.namaDosen ?? (item.dosenId ? `Dosen ID ${item.dosenId}` : '-') }}</td>
                  <td class="px-4 py-3">
                    <button
                      v-if="item.sudahDikontrak"
                      :disabled="pendingBatalkanId !== null"
                      class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/20 disabled:cursor-not-allowed disabled:opacity-60"
                      @click="handleBatalkan(item.jadwalId)"
                    >
                      <span v-if="pendingBatalkanId === item.jadwalId" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-danger)]/40 border-t-[var(--color-danger)]" />
                      <X v-else :size="14" />
                      Batalkan
                    </button>
                    <button
                      v-else
                      :disabled="pendingKontrakId !== null"
                      class="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                      @click="handleKontrak(item.jadwalId)"
                    >
                      <span v-if="pendingKontrakId === item.jadwalId" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      <Plus v-else :size="14" />
                      Kontrak
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
