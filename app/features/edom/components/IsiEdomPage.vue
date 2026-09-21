<script setup lang="ts">
import { ArrowLeft, CheckCircle2, Save } from '@lucide/vue';
import { getFormEdom, simpanJawabanEdom } from '../services/api';
import type { EdomJawabanPayload } from '../types';

interface AnswerState {
  jawaban?: string;
  jawabanEsay?: string;
}

const route = useRoute();
const router = useRouter();
const { showToast } = useToast();

const jadwalId = computed(() => route.params.jadwalId as string);
// Bawa balik periode yang sama ke KHS supaya filter yang sudah dipilih di sana tidak reset ke
// periode terbaru setelah simpan/batal.
const periode = computed(() => route.query.periode as string | undefined);
const khsBackLink = computed(() => (periode.value ? `/khs?periode=${periode.value}` : '/khs'));

const answers = ref<Record<number, AnswerState>>({});

const { data, pending, error } = await useAsyncData(`edom-${jadwalId.value}`, () => getFormEdom(jadwalId.value));
const isLoading = useMinLoading(pending);

const isSubmitting = ref(false);

function setJawabanPg(idListsoal: number, pilihanValue: string) {
  answers.value = { ...answers.value, [idListsoal]: { jawaban: pilihanValue } };
}

function setJawabanEsai(idListsoal: number, text: string) {
  answers.value = { ...answers.value, [idListsoal]: { jawabanEsay: text } };
}

const daftarSoal = computed(() => data.value?.daftarSoal ?? []);
const totalSoal = computed(() => daftarSoal.value.length);
const totalTerjawab = computed(
  () =>
    daftarSoal.value.filter((soal) => {
      const a = answers.value[soal.idListsoal];
      return soal.pilihan.length > 0 ? Boolean(a?.jawaban) : Boolean(a?.jawabanEsay?.trim());
    }).length,
);
const isComplete = computed(() => totalSoal.value > 0 && totalTerjawab.value === totalSoal.value);
const progressPercent = computed(() => (totalSoal.value > 0 ? Math.round((totalTerjawab.value / totalSoal.value) * 100) : 0));

async function handleSubmit() {
  if (!isComplete.value) return;
  const jawabanPayload: EdomJawabanPayload[] = daftarSoal.value.map((soal) => {
    const isPg = soal.pilihan.length > 0;
    const a = answers.value[soal.idListsoal];
    return {
      idListsoal: soal.idListsoal,
      tipeSoal: soal.tipeSoal,
      jawaban: isPg ? a?.jawaban : undefined,
      jawabanEsay: isPg ? undefined : a?.jawabanEsay,
    };
  });

  isSubmitting.value = true;
  try {
    await simpanJawabanEdom(jadwalId.value, jawabanPayload);
    showToast('✓ Jawaban EDOM berhasil disimpan', 'success');
    router.replace(khsBackLink.value);
  } catch (err) {
    showToast(getApiErrorMessage(err, '✕ Gagal menyimpan jawaban EDOM. Coba lagi.'), 'error');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="Isi EDOM"
      :description="
        data
          ? `${data.namaMataKuliah ?? 'Mata kuliah'} — ${data.namaDosen ?? (data.dosenId ? `Dosen ID ${data.dosenId}` : 'Dosen belum ditentukan')}`
          : 'Evaluasi Dosen oleh Mahasiswa'
      "
    />

    <Card v-if="isLoading">
      <PageLoader />
    </Card>

    <Card v-else-if="error">
      <EmptyState :icon="ArrowLeft" title="Gagal memuat form EDOM" :description="getApiErrorMessage(error, 'Terjadi kesalahan. Coba muat ulang halaman.')">
        <template #action>
          <NuxtLink :to="khsBackLink" class="text-sm font-semibold text-[var(--color-primary)] hover:underline">Kembali ke KHS</NuxtLink>
        </template>
      </EmptyState>
    </Card>

    <Card v-else-if="data && data.sudahEdom">
      <EmptyState
        :icon="CheckCircle2"
        title="Anda sudah mengisi EDOM"
        description="Terima kasih, evaluasi untuk mata kuliah ini sudah pernah Anda kirimkan sebelumnya."
      >
        <template #action>
          <NuxtLink :to="khsBackLink" class="text-sm font-semibold text-[var(--color-primary)] hover:underline">Kembali ke KHS</NuxtLink>
        </template>
      </EmptyState>
    </Card>

    <template v-else-if="data && !data.sudahEdom">
      <div class="sticky top-0 z-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3.5 shadow-sm backdrop-blur sm:px-6">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <span
              :class="[
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                isComplete ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]' : 'bg-[var(--color-primary)] text-white',
              ]"
            >
              {{ isComplete ? '✓' : totalTerjawab }}
            </span>
            <span class="text-sm text-[var(--color-text)]">
              Terjawab <span class="font-semibold">{{ totalTerjawab }}</span> dari <span class="font-semibold">{{ totalSoal }}</span> pertanyaan
            </span>
          </div>
          <span :class="['text-base font-bold tabular-nums', isComplete ? 'text-[var(--color-success)]' : 'text-[var(--color-primary)]']">
            {{ progressPercent }}%
          </span>
        </div>
        <div class="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg)]">
          <div
            :class="['h-full rounded-full transition-all duration-300 ease-out', isComplete ? 'bg-[var(--color-success)]' : 'bg-[var(--color-primary)]']"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <Card v-for="(soal, index) in daftarSoal" :key="soal.idListsoal">
          <p class="text-sm font-semibold text-[var(--color-text)]">{{ index + 1 }}. {{ soal.pertanyaan }}</p>

          <div v-if="soal.pilihan.length > 0" class="mt-4 flex flex-col gap-2">
            <label
              v-for="pilihan in [...soal.pilihan].sort((a, b) => a.urut - b.urut)"
              :key="`${soal.idListsoal}-${pilihan.urut}`"
              :class="[
                'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                answers[soal.idListsoal]?.jawaban === String(pilihan.urut)
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-text)]'
                  : 'border-[var(--color-border-dark)] text-[var(--color-text)] hover:bg-[var(--color-bg)]',
              ]"
            >
              <input
                type="radio"
                :name="`soal-${soal.idListsoal}`"
                :value="String(pilihan.urut)"
                :checked="answers[soal.idListsoal]?.jawaban === String(pilihan.urut)"
                class="h-4 w-4 border-[var(--color-border-dark)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/30"
                @change="setJawabanPg(soal.idListsoal, String(pilihan.urut))"
              >
              {{ pilihan.ket }}
            </label>
          </div>
          <textarea
            v-else
            :value="answers[soal.idListsoal]?.jawabanEsay ?? ''"
            rows="3"
            placeholder="Tulis jawaban Anda..."
            class="mt-4 w-full rounded-lg border border-[var(--color-border-dark)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            @input="setJawabanEsai(soal.idListsoal, ($event.target as HTMLTextAreaElement).value)"
          />
        </Card>
      </div>

      <div class="flex justify-end gap-2 pb-4">
        <NuxtLink
          :to="khsBackLink"
          class="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-dark)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-bg)]"
        >
          <ArrowLeft :size="16" />
          Batal
        </NuxtLink>
        <button
          :disabled="!isComplete || isSubmitting"
          class="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleSubmit"
        >
          <span v-if="isSubmitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          <Save v-else :size="16" />
          Simpan Jawaban
        </button>
      </div>
    </template>
  </div>
</template>
