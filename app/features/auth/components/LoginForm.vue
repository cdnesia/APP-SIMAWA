<script setup lang="ts">
import { AlarmClock, Eye, EyeOff, GraduationCap, IdCard, KeyRound, ShieldCheck } from '@lucide/vue';

const HIGHLIGHTS = [
  { icon: GraduationCap, text: 'Akses KRS, KHS, jadwal kuliah, dan transkrip nilai' },
  { icon: ShieldCheck, text: 'Data akademik Anda tersimpan aman dan terenkripsi' },
];

const { login } = useAuth();
const router = useRouter();
const { showToast } = useToast();

const npm = ref('');
const password = ref('');
const showPassword = ref(false);
const isSubmitting = ref(false);

// Error rate-limit (429) SENGAJA ditampilkan sebagai banner persisten di atas form, BUKAN toast -
// toast auto-hilang 3 detik (lihat useToast.ts), padahal sisa waktu tunggunya bisa bermenit-menit
// dan harus tetap kelihatan + jalan mundur hidup (bukan angka statis). Satu kalimat utuh yang
// dinamis ("Coba lagi dalam 1 menit 16 detik.") - bukan pesan statis + baris "Sisa waktu"
// terpisah, supaya angkanya jelas terlihat menghitung mundur di kalimat yang sama.
const rateLimitReason = ref<string | null>(null); // bagian SEBELUM "Coba lagi dalam ..." dari backend
const rateLimitSecondsLeft = ref(0);
let rateLimitTimer: ReturnType<typeof setInterval> | undefined;

function stopRateLimitCountdown() {
  clearInterval(rateLimitTimer);
  rateLimitTimer = undefined;
  rateLimitReason.value = null;
}

function startRateLimitCountdown(message: string, seconds: number) {
  stopRateLimitCountdown();
  rateLimitReason.value = message.replace(/Coba lagi dalam.*$/, '').trim();
  rateLimitSecondsLeft.value = Math.max(0, Math.ceil(seconds));

  rateLimitTimer = setInterval(() => {
    rateLimitSecondsLeft.value -= 1;
    if (rateLimitSecondsLeft.value <= 0) stopRateLimitCountdown();
  }, 1000);
}

onUnmounted(() => clearInterval(rateLimitTimer));

// Format sama persis dengan formatSisaWaktu() di SERVICE-SIMAWA/rateLimit.ts ("1 menit 16 detik",
// "5 menit", "40 detik") - supaya kalimat yang tampil ke mahasiswa konsisten gaya bahasanya.
const rateLimitMessage = computed(() => {
  if (!rateLimitReason.value) return null;

  const menit = Math.floor(rateLimitSecondsLeft.value / 60);
  const detik = rateLimitSecondsLeft.value % 60;
  const sisa = menit === 0 ? `${detik} detik` : detik === 0 ? `${menit} menit` : `${menit} menit ${detik} detik`;

  return `${rateLimitReason.value} Coba lagi dalam ${sisa}.`;
});

async function handleSubmit() {
  isSubmitting.value = true;
  try {
    await login(npm.value, password.value);
    router.replace('/');
  } catch (err) {
    const statusCode = (err as { statusCode?: number } | undefined)?.statusCode;
    const retryAfterSeconds = (err as { data?: { retryAfterSeconds?: number } } | undefined)?.data?.retryAfterSeconds;

    if (statusCode === 429 && typeof retryAfterSeconds === 'number') {
      startRateLimitCountdown(getApiErrorMessage(err, 'Terlalu banyak percobaan login.'), retryAfterSeconds);
    } else {
      showToast(getApiErrorMessage(err, 'NPM atau password salah'), 'error');
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen bg-[var(--color-bg)]">
    <!-- Panel kiri - branding, disembunyikan di layar kecil -->
    <div class="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[var(--color-primary)] p-10 text-white lg:flex">
      <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
      <div class="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-[var(--color-primary-dark)]/60" />

      <div class="relative z-10 flex items-center gap-2.5">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
          <GraduationCap :size="22" />
        </div>
        <span class="text-lg font-bold tracking-tight">SIMAWA</span>
      </div>

      <div class="relative z-10 max-w-md">
        <h1 class="text-3xl font-bold leading-tight">Sistem Informasi Mahasiswa</h1>
        <p class="mt-3 text-sm leading-relaxed text-white/80">
          Satu tempat untuk mengelola seluruh urusan akademik Anda, dari kartu rencana studi sampai kelulusan.
        </p>

        <div class="mt-8 flex flex-col gap-4">
          <div v-for="highlight in HIGHLIGHTS" :key="highlight.text" class="flex items-center gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <component :is="highlight.icon" :size="18" />
            </div>
            <p class="text-sm text-white/90">{{ highlight.text }}</p>
          </div>
        </div>
      </div>

      <p class="relative z-10 text-xs text-white/60">&copy; {{ new Date().getFullYear() }} SIMAWA. Seluruh hak cipta dilindungi.</p>
    </div>

    <!-- Panel kanan - form login -->
    <div class="flex w-full flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:w-1/2">
      <div class="w-full max-w-sm">
        <div class="mb-8 flex items-center gap-2.5 lg:hidden">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
            <GraduationCap :size="22" />
          </div>
          <span class="text-lg font-bold text-[var(--color-text)]">SIMAWA</span>
        </div>

        <h2 class="text-2xl font-bold text-[var(--color-text)]">Masuk ke akun Anda</h2>
        <p class="mt-1.5 text-sm text-[var(--color-text-muted)]">Gunakan NPM dan password untuk mengakses SIMAWA.</p>

        <div v-if="rateLimitMessage" class="mt-5 flex items-start gap-3 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3">
          <AlarmClock :size="18" class="mt-0.5 shrink-0 text-[var(--color-danger)]" />
          <p class="text-sm font-semibold text-[var(--color-danger)]">{{ rateLimitMessage }}</p>
        </div>

        <form class="mt-7 flex flex-col gap-4" @submit.prevent="handleSubmit">
          <Input v-model="npm" label="NPM" type="text" autocomplete="username" placeholder="Contoh: 21103154251001" required>
            <template #leftIcon><IdCard :size="18" /></template>
          </Input>

          <Input
            v-model="password"
            label="Password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="Masukkan password"
            required
          >
            <template #leftIcon><KeyRound :size="18" /></template>
            <template #rightIcon>
              <button
                type="button"
                class="pointer-events-auto text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                tabindex="-1"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" :size="18" />
                <Eye v-else :size="18" />
              </button>
            </template>
          </Input>

          <Button type="submit" :is-loading="isSubmitting" :disabled="!!rateLimitMessage" class="mt-2 w-full">Masuk</Button>
        </form>

        <div class="mt-6 rounded-lg bg-[var(--color-accent-light)] px-4 py-3">
          <p class="text-xs leading-relaxed text-[var(--color-accent-dark)]">
            <strong>Password default</strong> adalah NPM Anda sendiri. Demi keamanan, segera ganti password setelah login pertama kali.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
