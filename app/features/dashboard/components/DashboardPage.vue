<script setup lang="ts">
import {
  Award,
  Banknote,
  BookMarked,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileBarChart,
  GraduationCap,
  Mail,
  Phone,
  Receipt,
  Smartphone,
  Users,
  Users2,
  VenetianMask,
} from '@lucide/vue';
import { getIpkTrend } from '~/features/khs/services/api';
import { getMyProfile } from '~/features/mahasiswa/services/api';
import { getRincianTagihanAktif } from '~/features/tagihan/services/api';
import { formatRupiah, formatTanggal } from '~/utils/format';
import IpkTrendChart from './IpkTrendChart.vue';

// Path diisi kalau halamannya sudah jadi - kalau tidak, kartu tetap tampil sebagai "segera hadir"
// (biar konsisten dengan flag `enabled` di NAV_ITEMS milik AppLayout.vue).
const QUICK_LINKS = [
  { label: 'Jadwal Kuliah', description: 'Lihat jadwal kelas Anda', icon: CalendarDays, path: '/jadwal-kuliah' },
  { label: 'KRS', description: 'Lihat & kontrak mata kuliah', icon: ClipboardList, path: '/krs' },
  { label: 'KHS', description: 'Kartu hasil studi per semester', icon: BookMarked, path: '/khs' },
  { label: 'Transkrip Nilai', description: 'Riwayat nilai lengkap', icon: FileBarChart, path: null },
  { label: 'Kegiatan Mahasiswa', description: 'KKN, PKL, seminar, wisuda', icon: Users2, path: null },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

const { user } = useAuth();
const { showToast } = useToast();
const hasShownError = ref(false);
const hasShownIpkError = ref(false);
const hasShownTagihanError = ref(false);

const { data: profile, pending, error } = await useAsyncData('mahasiswa-me', () => getMyProfile());
const isProfileLoading = useMinLoading(pending);

watch(error, (err) => {
  if (err && !hasShownError.value) {
    hasShownError.value = true;
    showToast(getApiErrorMessage(err, 'Gagal memuat data. Periksa koneksi Anda.'), 'error');
  }
});

const { data: ipkTrend, pending: ipkPending, error: ipkError } = await useAsyncData('dashboard-ipk-trend', () => getIpkTrend());
const isIpkLoading = useMinLoading(ipkPending);

watch(ipkError, (err) => {
  if (err && !hasShownIpkError.value) {
    hasShownIpkError.value = true;
    showToast(getApiErrorMessage(err, 'Gagal memuat grafik IPK.'), 'error');
  }
});

const { data: tagihan, pending: tagihanPending, error: tagihanError } = await useAsyncData('dashboard-tagihan', () => getRincianTagihanAktif());
const isTagihanLoading = useMinLoading(tagihanPending);

watch(tagihanError, (err) => {
  if (err && !hasShownTagihanError.value) {
    hasShownTagihanError.value = true;
    showToast(getApiErrorMessage(err, 'Gagal memuat rincian tagihan.'), 'error');
  }
});

// Rincian yang HARUS DIBAYAR = belum lunas saja (SPP untuk penerima KIP Kuliah sudah disaring
// dari sisi server, lihat SERVICE-SIMAWA::getRincianTagihanAktif - tidak perlu disaring lagi di sini).
const tagihanBelumLunas = computed(() => (tagihan.value?.items ?? []).filter((t) => Number(t.nominal_ditagih) > Number(t.nominal_terbayar)));
const totalTagihanBelumLunas = computed(() =>
  tagihanBelumLunas.value.reduce((sum, t) => sum + (Number(t.nominal_ditagih) - Number(t.nominal_terbayar)), 0),
);

const firstName = computed(() => user.value?.name?.split(' ')[0] ?? '');

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

// Nomor tagihan dipakai mahasiswa sebagai kode bayar/nomor VA saat transfer - lihat
// SERVICE-PUBLIC::tagihan.service.ts (nomorTagihan diturunkan dari va_code mahasiswa), tidak ada
// kolom VA terpisah yang di-expose backend.
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
    <div>
      <h1 class="text-xl font-bold text-[var(--color-text)]">{{ getGreeting() }}, {{ firstName }} 👋</h1>
      <p class="text-sm text-[var(--color-text-muted)]">Berikut ringkasan data akademik Anda hari ini.</p>
    </div>

    <!-- Profil & grafik IPK sebelahan - grafik full width sendiri kelihatan terlalu besar/kosong,
         dipasangkan dengan profil supaya proporsional. -->
    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
    <Card v-if="isProfileLoading">
      <PageLoader />
    </Card>

    <Card v-else-if="error" class="border-[var(--color-danger)]/30">
      <p class="text-sm text-[var(--color-danger)]">
        Gagal memuat profil mahasiswa. Periksa koneksi Anda, atau coba muat ulang halaman.
      </p>
    </Card>

    <Card v-else-if="profile">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-5">
        <div class="flex items-center gap-4">
          <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-lg font-bold text-white">
            {{ initials(profile.namaMahasiswa) }}
          </div>
          <div>
            <h3 class="text-base font-semibold text-[var(--color-text)]">{{ profile.namaMahasiswa }}</h3>
            <p class="text-sm text-[var(--color-text-muted)]">NPM: {{ profile.npm }}</p>
            <Badge v-if="profile.penerimaBeasiswa" tone="success" class="mt-1.5">
              <Award :size="10" class="mr-1 inline" />Penerima Beasiswa{{ profile.namaBeasiswa ? ` · ${profile.namaBeasiswa}` : '' }}
            </Badge>
          </div>
        </div>
        <span class="rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-xs font-semibold text-[var(--color-accent-dark)]">
          {{ profile.status === 'A' ? 'Mahasiswa Aktif' : profile.status }}
        </span>
      </div>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <GraduationCap :size="16" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium text-[var(--color-text-muted)]">Program Studi</p>
            <p class="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">{{ profile.namaProgramStudi || '-' }}</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Building2 :size="16" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium text-[var(--color-text-muted)]">Fakultas</p>
            <p class="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">{{ profile.namaFakultas || '-' }}</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Users :size="16" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium text-[var(--color-text-muted)]">Kelas Kuliah</p>
            <p class="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">{{ profile.namaKelasKuliah || '-' }}</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <CalendarDays :size="16" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium text-[var(--color-text-muted)]">Angkatan</p>
            <p class="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">{{ profile.tahunAngkatan || '-' }}</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <VenetianMask :size="16" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium text-[var(--color-text-muted)]">Jenis Kelamin</p>
            <p class="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">
              {{ profile.jenisKelamin === 'L' ? 'Laki-laki' : profile.jenisKelamin === 'P' ? 'Perempuan' : profile.jenisKelamin || '-' }}
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Mail :size="16" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium text-[var(--color-text-muted)]">Email</p>
            <p class="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">{{ profile.email || '-' }}</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Phone :size="16" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium text-[var(--color-text-muted)]">Telepon</p>
            <p class="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">{{ profile.telepon || '-' }}</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Smartphone :size="16" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium text-[var(--color-text-muted)]">Handphone</p>
            <p class="mt-0.5 truncate text-sm font-semibold text-[var(--color-text)]">{{ profile.handphone || '-' }}</p>
          </div>
        </div>
      </div>
    </Card>

    <Card>
      <PageLoader v-if="isIpkLoading" />
      <p v-else-if="ipkError" class="py-8 text-center text-sm text-[var(--color-danger)]">
        Gagal memuat grafik IPK. Periksa koneksi Anda, atau coba muat ulang halaman.
      </p>
      <IpkTrendChart v-else :items="ipkTrend?.items ?? []" />
    </Card>
    </div>

    <Card>
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-[var(--color-text)]">Tagihan Tahun Ini</h3>
        <NuxtLink to="/tagihan" class="text-xs font-semibold text-[var(--color-primary)] hover:underline">Lihat semua</NuxtLink>
      </div>

      <PageLoader v-if="isTagihanLoading" />

      <p v-else-if="tagihanError" class="py-6 text-center text-sm text-[var(--color-danger)]">
        Gagal memuat tagihan. Periksa koneksi Anda.
      </p>

      <div v-else-if="tagihanBelumLunas.length === 0" class="flex flex-col items-center gap-2 py-6 text-center">
        <CheckCircle2 :size="28" class="text-[var(--color-success)]" />
        <p class="text-sm font-semibold text-[var(--color-text)]">Tidak ada tagihan tahun ini</p>
        <p class="text-xs text-[var(--color-text-muted)]">
          {{ tagihan?.isPenerimaKipk ? 'SPP tidak dikenakan karena Anda penerima KIP Kuliah.' : 'Tidak ada tagihan yang perlu dibayar saat ini.' }}
        </p>
      </div>

      <div v-else class="flex flex-col gap-4">
        <StatCard label="Total yang Harus Dibayar" :value="formatRupiah(totalTagihanBelumLunas)" :icon="Banknote" tone="primary" />

        <!-- Tabel horizontal (bukan card bertumpuk ke bawah) - dipilih supaya kalau tagihan
             banyak, daftarnya melebar bukan memanjangkan halaman dashboard tanpa batas. -->
        <div class="overflow-hidden rounded-xl border border-[var(--color-border)]">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[900px] text-left text-sm">
              <thead class="border-b border-[var(--color-border)] bg-[var(--color-bg)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <tr>
                  <th class="px-4 py-3 font-semibold">Kode Bayar / VA</th>
                  <th class="px-4 py-3 font-semibold">Jenis Tagihan</th>
                  <th class="px-4 py-3 text-right font-semibold">Total Tagihan</th>
                  <th class="px-4 py-3 text-right font-semibold">Jumlah Ditagih</th>
                  <th class="px-4 py-3 text-right font-semibold">Jumlah Dibayar</th>
                  <th class="px-4 py-3 text-right font-semibold">Sisa Tagihan</th>
                  <th class="px-4 py-3 font-semibold">Tanggal Kadaluarsa</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border)]">
                <tr v-for="item in tagihanBelumLunas" :key="item.id_record_tagihan" class="hover:bg-[var(--color-bg)]">
                  <td class="whitespace-nowrap px-4 py-3">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-[var(--color-text)]">{{ item.nomor_tagihan }}</span>
                      <button
                        type="button"
                        class="flex shrink-0 items-center gap-1 rounded-md border border-[var(--color-border-dark)] px-2 py-1 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10"
                        @click="copyKodeBayar(item.nomor_tagihan)"
                      >
                        <Copy :size="12" />
                        Salin
                      </button>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5">
                      <Receipt :size="12" class="shrink-0 text-[var(--color-text-muted)]" />
                      <span class="font-semibold text-[var(--color-text)]">{{ item.jenis_tagihan }}</span>
                    </div>
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-right text-[var(--color-text)]">{{ formatRupiah(item.total_tagihan) }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-right text-[var(--color-text)]">{{ formatRupiah(item.nominal_ditagih) }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-right text-[var(--color-text)]">{{ formatRupiah(item.nominal_terbayar) }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-right font-bold text-[var(--color-danger)]">
                    {{ formatRupiah(Number(item.nominal_ditagih) - Number(item.nominal_terbayar)) }}
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">{{ formatTanggal(item.waktu_berakhir) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p v-if="tagihan?.isPenerimaKipk" class="rounded-lg bg-[var(--color-success)]/10 px-3 py-2 text-xs text-[var(--color-success)]">
          SPP tidak ditampilkan - sudah dijamin KIP Kuliah.
        </p>
      </div>
    </Card>

    <div>
      <h2 class="mb-3 text-sm font-semibold text-[var(--color-text)]">Menu Akademik</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <template v-for="link in QUICK_LINKS" :key="link.label">
          <NuxtLink
            v-if="link.path"
            :to="link.path"
            class="flex items-start gap-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-colors hover:bg-[var(--color-bg)]"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <component :is="link.icon" :size="20" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-sm font-semibold text-[var(--color-text)]">{{ link.label }}</h3>
              <p class="mt-0.5 text-xs text-[var(--color-text-muted)]">{{ link.description }}</p>
            </div>
          </NuxtLink>
          <Card v-else class="flex cursor-not-allowed items-start gap-3.5 opacity-70" title="Segera hadir">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <component :is="link.icon" :size="20" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-[var(--color-text)]">{{ link.label }}</h3>
                <span class="rounded-full bg-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
                  segera
                </span>
              </div>
              <p class="mt-0.5 text-xs text-[var(--color-text-muted)]">{{ link.description }}</p>
            </div>
          </Card>
        </template>
      </div>
    </div>
  </div>
</template>
