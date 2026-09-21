<script setup lang="ts">
import { BookOpen, CalendarDays, ClipboardList } from '@lucide/vue';
import { getJadwalKuliah } from '../services/api';
import type { JadwalKuliahItem } from '../types';
import { formatTahunAkademikLabel } from '~/utils/tahunAkademik';

function formatJam(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

// Item dari backend sudah terurut per hariId (Senin -> Minggu) lalu jam mulai, jadi tinggal
// dikelompokkan berurutan tanpa perlu sort ulang di sini.
function groupByHari(items: JadwalKuliahItem[]) {
  const groups: { hariId: number | null; namaHari: string; items: JadwalKuliahItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.hariId === item.hariId) {
      last.items.push(item);
    } else {
      groups.push({ hariId: item.hariId, namaHari: item.namaHari ?? 'Hari belum ditentukan', items: [item] });
    }
  }
  return groups;
}

const { showToast } = useToast();
const hasShownError = ref(false);

const { data, pending, error } = await useAsyncData('jadwal-kuliah', () => getJadwalKuliah());

const isNotFound = computed(() => (error.value as { statusCode?: number } | null)?.statusCode === 404);

watch(error, (err) => {
  if (err && !isNotFound.value && !hasShownError.value) {
    hasShownError.value = true;
    showToast(getApiErrorMessage(err, '✕ Gagal memuat data. Periksa koneksi Anda.'), 'error');
  }
});

const items = computed(() => data.value?.items ?? []);
const totalSks = computed(() => items.value.reduce((sum, item) => sum + (item.sks ?? 0), 0));
const grouped = computed(() => groupByHari(items.value));
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="Jadwal Kuliah"
      :description="
        data
          ? `Mata kuliah yang dikontrak pada periode ${formatTahunAkademikLabel(data.kodeTahunAkademik)}.`
          : 'Mata kuliah yang dikontrak pada tahun akademik yang sedang aktif.'
      "
    />

    <div v-if="pending" class="flex flex-col gap-4">
      <Card v-for="i in 2" :key="i">
        <div class="animate-pulse space-y-3 p-1">
          <div v-for="j in 2" :key="j" class="h-10 rounded-lg bg-[var(--color-border)]" />
        </div>
      </Card>
    </div>

    <Card v-else-if="isNotFound">
      <EmptyState
        :icon="CalendarDays"
        title="Tidak ada tahun akademik aktif"
        description="Jadwal kuliah baru bisa ditampilkan kalau ada tahun akademik yang sedang berjalan. Hubungi akademik/prodi kalau ini seharusnya sudah dibuka."
      />
    </Card>

    <Card v-else-if="error">
      <p class="py-8 text-center text-sm text-[var(--color-danger)]">
        Gagal memuat jadwal kuliah. Periksa koneksi Anda, atau coba muat ulang halaman.
      </p>
    </Card>

    <template v-else>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatCard label="Total SKS" :value="totalSks" :icon="BookOpen" tone="primary" />
        <StatCard label="Mata Kuliah" :value="items.length" :icon="ClipboardList" tone="accent" />
      </div>

      <Card v-if="items.length === 0">
        <EmptyState
          :icon="CalendarDays"
          title="Belum ada jadwal kuliah"
          description="Jadwal mengikuti mata kuliah yang sudah dikontrak (KRS) pada tahun akademik aktif. Kontrak mata kuliah dulu supaya jadwalnya muncul di sini."
        >
          <template #action>
            <NuxtLink
              to="/krs/kontrak"
              class="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
            >
              <ClipboardList :size="16" />
              Kontrak KRS
            </NuxtLink>
          </template>
        </EmptyState>
      </Card>

      <div v-else class="flex flex-col gap-4">
        <div
          v-for="group in grouped"
          :key="group.hariId ?? group.namaHari"
          class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"
        >
          <div class="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
            <h3 class="text-sm font-semibold text-[var(--color-text)]">{{ group.namaHari }}</h3>
            <span class="text-xs text-[var(--color-text-muted)]">{{ group.items.length }} mata kuliah</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px] table-fixed text-left text-sm">
              <colgroup>
                <col class="w-[14%]" >
                <col class="w-[10%]" >
                <col class="w-[28%]" >
                <col class="w-[8%]" >
                <col class="w-[20%]" >
                <col class="w-[20%]" >
              </colgroup>
              <thead class="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <tr>
                  <th class="px-4 py-3 font-semibold">Jam</th>
                  <th class="px-4 py-3 font-semibold">Kode</th>
                  <th class="px-4 py-3 font-semibold">Mata Kuliah</th>
                  <th class="px-4 py-3 text-right font-semibold">SKS</th>
                  <th class="px-4 py-3 font-semibold">Ruang</th>
                  <th class="px-4 py-3 font-semibold">Dosen</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border)]">
                <tr v-for="item in group.items" :key="item.jadwalId" class="transition-colors hover:bg-[var(--color-bg)]">
                  <td class="whitespace-nowrap px-4 py-3 text-[var(--color-text-muted)]">
                    {{ formatJam(item.jamMulai) && formatJam(item.jamSelesai) ? `${formatJam(item.jamMulai)}-${formatJam(item.jamSelesai)}` : '-' }}
                  </td>
                  <td class="truncate px-4 py-3 font-medium text-[var(--color-text)]">{{ item.kodeMataKuliah ?? '-' }}</td>
                  <td class="px-4 py-3 text-[var(--color-text)]">
                    <span class="truncate">{{ item.namaMataKuliah ?? 'Mata kuliah tidak diketahui' }}</span>
                    <span v-if="item.kelompok" class="ml-1.5 text-xs text-[var(--color-text-muted)]">&middot; {{ item.kelompok }}</span>
                  </td>
                  <td class="px-4 py-3 text-right text-[var(--color-text)]">{{ item.sks ?? '-' }}</td>
                  <td class="truncate px-4 py-3 text-[var(--color-text-muted)]" :title="item.namaRuang ?? undefined">
                    {{ item.namaRuang ?? (item.ruangId ? `Ruang #${item.ruangId}` : '-') }}
                  </td>
                  <td class="truncate px-4 py-3 text-[var(--color-text-muted)]" :title="item.namaDosen ?? undefined">
                    {{ item.namaDosen ?? (item.dosenId ? `Dosen ID ${item.dosenId}` : '-') }}
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
