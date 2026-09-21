<script setup lang="ts">
import { Banknote, CheckCircle2, Clock, Receipt } from '@lucide/vue';
import { cekTagihanSaya } from '../services/api';
import { formatRupiah, formatTanggal } from '~/utils/format';

// SERVICE-SIMAWA yang panggil SERVICE-PUBLIC (M2M client_credentials) untuk data ini, APP-SIMAWA
// sendiri tidak punya kredensial M2M. Hanya cek/lihat tagihan sendiri (scope tagihan:cek), tidak
// ada aksi bayar/buat/ubah di sini - itu di luar cakupan portal self-service mahasiswa.
const { showToast } = useToast();
const hasShownError = ref(false);

const { data, pending, error } = await useAsyncData('tagihan-cek', () => cekTagihanSaya());

watch(error, (err) => {
  if (err && !hasShownError.value) {
    hasShownError.value = true;
    showToast(getApiErrorMessage(err, '✕ Gagal memuat data tagihan. Periksa koneksi Anda.'), 'error');
  }
});

const items = computed(() => data.value ?? []);
const belumLunas = computed(() => items.value.filter((t) => Number(t.nominal_ditagih) > Number(t.nominal_terbayar)));
const totalBelumLunas = computed(() => belumLunas.value.reduce((sum, t) => sum + (Number(t.nominal_ditagih) - Number(t.nominal_terbayar)), 0));
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Tagihan" description="Daftar tagihan keuangan Anda." />

    <Card v-if="pending">
      <div class="animate-pulse space-y-3 p-1">
        <div v-for="i in 3" :key="i" class="h-10 rounded-lg bg-[var(--color-border)]" />
      </div>
    </Card>

    <Card v-else-if="error">
      <p class="py-8 text-center text-sm text-[var(--color-danger)]">
        Gagal memuat tagihan. Periksa koneksi Anda, atau coba muat ulang halaman.
      </p>
    </Card>

    <Card v-else-if="items.length === 0">
      <EmptyState :icon="Receipt" title="Belum ada tagihan" description="Anda belum memiliki tagihan keuangan yang tercatat." />
    </Card>

    <template v-else>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatCard label="Jumlah Tagihan" :value="items.length" :icon="Receipt" tone="primary" />
        <StatCard label="Total Belum Lunas" :value="formatRupiah(totalBelumLunas)" :icon="Banknote" tone="accent" />
      </div>

      <div class="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-left text-sm">
            <thead class="border-b border-[var(--color-border)] bg-[var(--color-bg)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th class="px-4 py-3 font-semibold">Nomor Tagihan</th>
                <th class="px-4 py-3 font-semibold">Jenis</th>
                <th class="px-4 py-3 font-semibold">Periode</th>
                <th class="px-4 py-3 text-right font-semibold">Ditagih</th>
                <th class="px-4 py-3 text-right font-semibold">Terbayar</th>
                <th class="px-4 py-3 font-semibold">Batas Waktu</th>
                <th class="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)]">
              <tr v-for="item in items" :key="item.id" class="transition-colors hover:bg-[var(--color-bg)]">
                <td class="whitespace-nowrap px-4 py-3 font-medium text-[var(--color-text)]">{{ item.nomor_tagihan }}</td>
                <td class="px-4 py-3 text-[var(--color-text)]">{{ item.jenis_tagihan }}</td>
                <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ item.tahun_akademik }}</td>
                <td class="px-4 py-3 text-right text-[var(--color-text)]">{{ formatRupiah(item.nominal_ditagih) }}</td>
                <td class="px-4 py-3 text-right text-[var(--color-text)]">{{ formatRupiah(item.nominal_terbayar) }}</td>
                <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ formatTanggal(item.waktu_berakhir) }}</td>
                <td class="px-4 py-3">
                  <Badge v-if="Number(item.nominal_ditagih) <= Number(item.nominal_terbayar)" tone="success">
                    <CheckCircle2 :size="10" class="mr-1 inline" />Lunas
                  </Badge>
                  <Badge v-else tone="warning"><Clock :size="10" class="mr-1 inline" />Belum Lunas</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
