<script setup lang="ts">
import { CheckCheck, ClipboardCheck, Clock, Search, ShieldCheck, X } from '@lucide/vue';
import { getPertemuanVerifikasi, verifikasiPertemuan } from '../services/api';
import type { PertemuanVerifikasiItem } from '../types';
import { formatTanggal } from '~/utils/format';
import { formatTahunAkademikLabel } from '~/utils/tahunAkademik';

type FilterStatus = 'perlu' | 'belum-bisa' | 'terverifikasi' | 'semua';

const PILIHAN_PER_HALAMAN = [10, 20, 50, 100] as const;

const { showToast } = useToast();
const hasShownError = ref(false);

const { data, pending, error } = await useAsyncData('pertemuan-verifikasi', () => getPertemuanVerifikasi());
const isLoading = useMinLoading(pending);

watch(error, (err) => {
  if (err && !hasShownError.value) {
    hasShownError.value = true;
    showToast(getApiErrorMessage(err, '✕ Gagal memuat data. Periksa koneksi Anda.'), 'error');
  }
});

const items = computed(() => data.value?.items ?? []);
const jumlahPerlu = computed(() => items.value.filter((i) => i.bisaDiverifikasi).length);
const jumlahBelumBisa = computed(() => items.value.filter((i) => i.statusVerifikasi === 'MENUNGGU' && !i.bisaDiverifikasi).length);
const jumlahTerverifikasi = computed(() => items.value.filter((i) => i.statusVerifikasi === 'TERVERIFIKASI').length);

// ── Toolbar: jumlah per halaman → filter (dropdown) → pencarian ──────────────────────────────────────────────────────
const perHalaman = ref<number>(10);
const filterStatus = ref<FilterStatus>('perlu');
const filterJadwal = ref('');
const kataKunci = ref('');
const halaman = ref(1);

// Default "Perlu diverifikasi" - kalau kosong (semua sudah beres) langsung tampilkan semua supaya tidak terlihat hampa.
watch(
  items,
  (list) => {
    if (filterStatus.value === 'perlu' && list.length > 0 && !list.some((i) => i.bisaDiverifikasi)) filterStatus.value = 'semua';
  },
  { immediate: true },
);

const opsiMataKuliah = computed(() => {
  const peta = new Map<string, { label: string; jumlah: number }>();
  for (const i of items.value) {
    const ada = peta.get(i.jadwalId);
    if (ada) ada.jumlah++;
    else peta.set(i.jadwalId, { label: `${i.namaMataKuliah ?? 'Mata kuliah'}${i.kelompok ? ` (${i.kelompok})` : ''}`, jumlah: 1 });
  }
  return [...peta.entries()].map(([jadwalId, v]) => ({ jadwalId, ...v })).sort((a, b) => a.label.localeCompare(b.label, 'id'));
});

function cocokStatus(i: PertemuanVerifikasiItem, f: FilterStatus) {
  if (f === 'perlu') return i.bisaDiverifikasi;
  if (f === 'belum-bisa') return i.statusVerifikasi === 'MENUNGGU' && !i.bisaDiverifikasi;
  if (f === 'terverifikasi') return i.statusVerifikasi === 'TERVERIFIKASI';
  return true;
}

const terfilter = computed(() => {
  const q = kataKunci.value.trim().toLowerCase();
  return items.value.filter((i) => {
    if (!cocokStatus(i, filterStatus.value)) return false;
    if (filterJadwal.value && i.jadwalId !== filterJadwal.value) return false;
    if (!q) return true;
    return [i.namaMataKuliah, i.kodeMataKuliah, i.namaDosen, i.bahanKajian, `pertemuan ${i.pertemuan}`]
      .some((v) => v?.toLowerCase().includes(q));
  });
});

watch([perHalaman, filterStatus, filterJadwal, kataKunci], () => {
  halaman.value = 1;
});

const jumlahHalaman = computed(() => Math.max(1, Math.ceil(terfilter.value.length / perHalaman.value)));
watch(jumlahHalaman, (n) => {
  if (halaman.value > n) halaman.value = n;
});
const awal = computed(() => (halaman.value - 1) * perHalaman.value);
const tampil = computed(() => terfilter.value.slice(awal.value, awal.value + perHalaman.value));

// Nomor halaman ringkas: 1 … 4 5 6 … 12
const nomorHalaman = computed<(number | '…')[]>(() => {
  const n = jumlahHalaman.value;
  const h = halaman.value;
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
  const hasil: (number | '…')[] = [1];
  const mulai = Math.max(2, h - 1);
  const akhir = Math.min(n - 1, h + 1);
  if (mulai > 2) hasil.push('…');
  for (let i = mulai; i <= akhir; i++) hasil.push(i);
  if (akhir < n - 1) hasil.push('…');
  hasil.push(n);
  return hasil;
});

// ── Pilihan (hanya baris yang bisa diverifikasi) ─────────────────────────────────────────────────────────────────────
const dipilih = ref<Set<string>>(new Set());
const bisaDipilihDiHalaman = computed(() => tampil.value.filter((i) => i.bisaDiverifikasi));
const semuaHalamanDipilih = computed(
  () => bisaDipilihDiHalaman.value.length > 0 && bisaDipilihDiHalaman.value.every((i) => dipilih.value.has(i.id)),
);

function togglePilih(id: string) {
  const baru = new Set(dipilih.value);
  if (baru.has(id)) baru.delete(id);
  else baru.add(id);
  dipilih.value = baru;
}

function togglePilihHalaman() {
  const baru = new Set(dipilih.value);
  const pilihSemua = !semuaHalamanDipilih.value;
  for (const i of bisaDipilihDiHalaman.value) {
    if (pilihSemua) baru.add(i.id);
    else baru.delete(i.id);
  }
  dipilih.value = baru;
}

// Buang pilihan yang sudah tidak bisa diverifikasi (mis. setelah data dimuat ulang).
watch(items, (list) => {
  const valid = new Set(list.filter((i) => i.bisaDiverifikasi).map((i) => i.id));
  dipilih.value = new Set([...dipilih.value].filter((id) => valid.has(id)));
});

// ── Konfirmasi & kirim ───────────────────────────────────────────────────────────────────────────────────────────────
const targetKonfirmasi = ref<PertemuanVerifikasiItem[] | null>(null);
const isSubmitting = ref(false);

function bukaKonfirmasi(target: PertemuanVerifikasiItem[]) {
  if (target.length > 0) targetKonfirmasi.value = target;
}

function bukaKonfirmasiTerpilih() {
  bukaKonfirmasi(items.value.filter((i) => dipilih.value.has(i.id)));
}

function tutupKonfirmasi() {
  if (!isSubmitting.value) targetKonfirmasi.value = null;
}

async function kirimVerifikasi() {
  const target = targetKonfirmasi.value;
  if (!target) return;
  isSubmitting.value = true;
  try {
    const hasil = await verifikasiPertemuan(target.map((i) => i.id));
    data.value = hasil;
    showToast(`✓ ${hasil.jumlahDiverifikasi} pertemuan berhasil diverifikasi`, 'success');
    targetKonfirmasi.value = null;
  } catch (err) {
    showToast(getApiErrorMessage(err, '✕ Gagal memverifikasi pertemuan. Coba lagi.'), 'error');
    targetKonfirmasi.value = null;
    // Status di server mungkin sudah berubah (mis. diverifikasi dari tab lain) - muat ulang supaya tampilan sinkron.
    data.value = await getPertemuanVerifikasi().catch(() => data.value);
  } finally {
    isSubmitting.value = false;
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') tutupKonfirmasi();
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="Verifikasi Pertemuan"
      :description="
        data
          ? `Pertemuan perkuliahan periode ${formatTahunAkademikLabel(data.kodeTahunAkademik)} yang ditugaskan kepada Anda untuk diverifikasi.`
          : 'Pertemuan perkuliahan yang ditugaskan kepada Anda untuk diverifikasi.'
      "
    />

    <Card v-if="isLoading">
      <PageLoader />
    </Card>

    <Card v-else-if="error">
      <p class="py-8 text-center text-sm text-[var(--color-danger)]">
        Gagal memuat data pertemuan. Periksa koneksi Anda, atau coba muat ulang halaman.
      </p>
    </Card>

    <Card v-else-if="items.length === 0">
      <EmptyState
        :icon="ClipboardCheck"
        title="Tidak ada pertemuan untuk diverifikasi"
        description="Anda belum ditunjuk sebagai verifikator pertemuan pada semester ini. Jika Anda ketua kelas, hubungi dosen atau prodi untuk ditetapkan sebagai verifikator."
      >
        <template #action>
          <NuxtLink
            to="/jadwal-kuliah"
            class="flex items-center gap-1.5 rounded-lg border border-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
          >
            Lihat Jadwal Kuliah
          </NuxtLink>
        </template>
      </EmptyState>
    </Card>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Perlu Diverifikasi" :value="jumlahPerlu" :icon="ClipboardCheck" tone="primary" />
        <StatCard label="Sudah Diverifikasi" :value="jumlahTerverifikasi" :icon="ShieldCheck" tone="accent" />
        <StatCard label="Belum Bisa Diverifikasi" :value="jumlahBelumBisa" :icon="Clock" />
      </div>

      <div class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <!-- Toolbar: jumlah per halaman (kiri) → filter → pencarian (kanan) -->
        <div class="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 lg:flex-row lg:items-end">
          <div class="flex flex-col gap-1">
            <label for="per-halaman" class="text-xs font-medium text-[var(--color-text-muted)]">Tampilkan</label>
            <select
              id="per-halaman"
              v-model.number="perHalaman"
              class="rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            >
              <option v-for="n in PILIHAN_PER_HALAMAN" :key="n" :value="n">{{ n }} data</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label for="filter-status" class="text-xs font-medium text-[var(--color-text-muted)]">Status</label>
            <select
              id="filter-status"
              v-model="filterStatus"
              class="rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            >
              <option value="perlu">Perlu diverifikasi ({{ jumlahPerlu }})</option>
              <option value="belum-bisa">Belum bisa diverifikasi ({{ jumlahBelumBisa }})</option>
              <option value="terverifikasi">Sudah diverifikasi ({{ jumlahTerverifikasi }})</option>
              <option value="semua">Semua ({{ items.length }})</option>
            </select>
          </div>
          <div class="flex min-w-0 flex-col gap-1 lg:max-w-xs">
            <label for="filter-mk" class="text-xs font-medium text-[var(--color-text-muted)]">Mata Kuliah</label>
            <select
              id="filter-mk"
              v-model="filterJadwal"
              class="truncate rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            >
              <option value="">Semua mata kuliah ({{ items.length }})</option>
              <option v-for="mk in opsiMataKuliah" :key="mk.jadwalId" :value="mk.jadwalId">{{ mk.label }} ({{ mk.jumlah }})</option>
            </select>
          </div>
          <div class="flex flex-col gap-1 lg:ml-auto lg:w-72">
            <label for="cari-pertemuan" class="text-xs font-medium text-[var(--color-text-muted)]">Cari</label>
            <div class="relative">
              <Search :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                id="cari-pertemuan"
                v-model="kataKunci"
                type="search"
                placeholder="Mata kuliah, dosen, bahan kajian…"
                class="w-full rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              >
            </div>
          </div>
        </div>

        <!-- Aksi massal -->
        <div
          v-if="dipilih.size > 0"
          class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-primary)]/5 px-4 py-3"
        >
          <p class="text-sm text-[var(--color-text)]"><span class="font-semibold">{{ dipilih.size }}</span> pertemuan dipilih</p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg)]"
              @click="dipilih = new Set()"
            >
              Batal pilih
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
              @click="bukaKonfirmasiTerpilih"
            >
              <CheckCheck :size="16" />
              Verifikasi terpilih
            </button>
          </div>
        </div>

        <div v-if="terfilter.length === 0" class="px-4">
          <EmptyState
            :icon="Search"
            :title="filterStatus === 'perlu' && !kataKunci && !filterJadwal ? 'Semua pertemuan sudah diverifikasi' : 'Tidak ada pertemuan yang cocok'"
            :description="
              filterStatus === 'perlu' && !kataKunci && !filterJadwal
                ? 'Tidak ada pertemuan yang menunggu verifikasi Anda saat ini.'
                : 'Ubah filter atau kata kunci pencarian untuk melihat pertemuan lain.'
            "
          >
            <template #action>
              <button
                type="button"
                class="rounded-lg border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
                @click="filterStatus = 'semua'; filterJadwal = ''; kataKunci = ''"
              >
                Tampilkan semua
              </button>
            </template>
          </EmptyState>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[880px] text-left text-sm">
            <thead class="border-b border-[var(--color-border)] bg-[var(--color-bg)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th class="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-[var(--color-border-dark)] accent-[var(--color-primary)]"
                    :checked="semuaHalamanDipilih"
                    :disabled="bisaDipilihDiHalaman.length === 0"
                    aria-label="Pilih semua pertemuan yang bisa diverifikasi di halaman ini"
                    @change="togglePilihHalaman"
                  >
                </th>
                <th class="px-4 py-3 font-semibold">Mata Kuliah</th>
                <th class="px-4 py-3 font-semibold">Pertemuan</th>
                <th class="px-4 py-3 font-semibold">Tanggal</th>
                <th class="px-4 py-3 font-semibold">Bahan Kajian</th>
                <th class="px-4 py-3 font-semibold">Status</th>
                <th class="px-4 py-3"><span class="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)]">
              <tr
                v-for="item in tampil"
                :key="item.id"
                :class="['transition-colors hover:bg-[var(--color-bg)]', dipilih.has(item.id) && 'bg-[var(--color-primary)]/5']"
              >
                <td class="px-4 py-3">
                  <input
                    v-if="item.bisaDiverifikasi"
                    type="checkbox"
                    class="h-4 w-4 rounded border-[var(--color-border-dark)] accent-[var(--color-primary)]"
                    :checked="dipilih.has(item.id)"
                    :aria-label="`Pilih ${item.namaMataKuliah ?? 'mata kuliah'} pertemuan ${item.pertemuan}`"
                    @change="togglePilih(item.id)"
                  >
                </td>
                <td class="px-4 py-3">
                  <p class="font-semibold text-[var(--color-text)]">{{ item.namaMataKuliah ?? 'Mata kuliah tidak diketahui' }}</p>
                  <p class="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    <span v-if="item.kodeMataKuliah" class="mr-1 rounded bg-[var(--color-bg)] px-1.5 py-0.5 font-mono">{{ item.kodeMataKuliah }}</span>
                    <span v-if="item.kelompok">Kelas {{ item.kelompok }} · </span>{{ item.namaDosen ?? 'Dosen belum diketahui' }}
                  </p>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-[var(--color-text)]">Ke-{{ item.pertemuan }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">{{ formatTanggal(item.tanggalPelaksanaan) }}</td>
                <td class="max-w-[220px] px-4 py-3 text-[var(--color-text-muted)]">
                  <span class="line-clamp-2" :title="item.bahanKajian ?? undefined">{{ item.bahanKajian ?? '-' }}</span>
                </td>
                <td class="whitespace-nowrap px-4 py-3">
                  <Badge v-if="item.statusVerifikasi === 'TERVERIFIKASI'" tone="success">
                    <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />Terverifikasi
                  </Badge>
                  <Badge v-else-if="item.bisaDiverifikasi" tone="warning">
                    <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />Menunggu
                  </Badge>
                  <Badge v-else tone="neutral">
                    <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />Belum bisa
                  </Badge>
                  <p v-if="item.statusVerifikasi === 'TERVERIFIKASI' && item.tanggalVerifikasi" class="mt-1 text-xs text-[var(--color-text-muted)]">
                    {{ formatTanggal(item.tanggalVerifikasi) }}
                  </p>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-right">
                  <button
                    v-if="item.bisaDiverifikasi"
                    type="button"
                    class="rounded-lg border border-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
                    @click="bukaKonfirmasi([item])"
                  >
                    Verifikasi
                  </button>
                  <span v-else-if="item.keterangan" class="text-xs text-[var(--color-text-muted)]">{{ item.keterangan }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer: info rentang + navigasi halaman bernomor -->
        <div
          v-if="terfilter.length > 0"
          class="flex flex-col items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3 text-sm sm:flex-row"
        >
          <p class="text-[var(--color-text-muted)]">
            Menampilkan {{ awal + 1 }}–{{ Math.min(awal + perHalaman, terfilter.length) }} dari {{ terfilter.length }} data
          </p>
          <nav class="flex items-center gap-1" aria-label="Navigasi halaman">
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg)] disabled:opacity-40"
              :disabled="halaman === 1"
              @click="halaman--"
            >
              Sebelumnya
            </button>
            <template v-for="(n, idx) in nomorHalaman" :key="`${n}-${idx}`">
              <span v-if="n === '…'" class="px-2 text-[var(--color-text-muted)]">…</span>
              <button
                v-else
                type="button"
                :class="[
                  'min-w-[2rem] rounded-lg px-2 py-1.5 transition-colors',
                  n === halaman ? 'bg-[var(--color-primary)] font-semibold text-white' : 'text-[var(--color-text)] hover:bg-[var(--color-bg)]',
                ]"
                :aria-current="n === halaman ? 'page' : undefined"
                @click="halaman = n"
              >
                {{ n }}
              </button>
            </template>
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg)] disabled:opacity-40"
              :disabled="halaman === jumlahHalaman"
              @click="halaman++"
            >
              Berikutnya
            </button>
          </nav>
        </div>
      </div>
    </template>

    <!-- Konfirmasi: verifikasi tidak bisa dibatalkan dari aplikasi -->
    <div
      v-if="targetKonfirmasi"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-konfirmasi"
      @click.self="tutupKonfirmasi"
    >
      <div class="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
        <div class="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="judul-konfirmasi" class="text-base font-semibold text-[var(--color-text)]">Verifikasi {{ targetKonfirmasi.length }} pertemuan?</h2>
            <p class="mt-1 text-sm text-[var(--color-text-muted)]">
              Dengan memverifikasi, Anda menyatakan pertemuan berikut benar-benar telah dilaksanakan. Verifikasi tidak bisa dibatalkan.
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg)]"
            aria-label="Tutup"
            :disabled="isSubmitting"
            @click="tutupKonfirmasi"
          >
            <X :size="18" />
          </button>
        </div>
        <ul class="max-h-60 divide-y divide-[var(--color-border)] overflow-y-auto px-5">
          <li v-for="item in targetKonfirmasi" :key="item.id" class="py-2.5 text-sm">
            <p class="font-medium text-[var(--color-text)]">{{ item.namaMataKuliah ?? 'Mata kuliah' }} · Pertemuan ke-{{ item.pertemuan }}</p>
            <p class="text-xs text-[var(--color-text-muted)]">{{ formatTanggal(item.tanggalPelaksanaan) }}<span v-if="item.bahanKajian"> · {{ item.bahanKajian }}</span></p>
          </li>
        </ul>
        <div class="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
          <button
            type="button"
            class="rounded-lg border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
            :disabled="isSubmitting"
            @click="tutupKonfirmasi"
          >
            Batal
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
            :disabled="isSubmitting"
            @click="kirimVerifikasi"
          >
            <CheckCheck :size="16" />
            {{ isSubmitting ? 'Memverifikasi…' : 'Ya, verifikasi' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
