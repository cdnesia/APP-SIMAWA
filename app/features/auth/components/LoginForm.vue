<script setup lang="ts">
import { AlarmClock, Eye, EyeOff, LoaderCircle, TriangleAlert } from '@lucide/vue';
import logoUrl from '~/assets/logo-umjambi.png';

const NAMA_KAMPUS = 'Universitas Muhammadiyah Jambi';

const tahunSekarang = new Date().getFullYear();

const { login } = useAuth();
const router = useRouter();
const route = useRoute();
const { showToast } = useToast();

// Tujuan setelah login = ?redirect dari middleware/apiFetch, HANYA path internal ("/..." tapi bukan "//domain-lain")
// supaya tidak bisa dipakai sebagai open redirect ke situs luar.
function tujuanSetelahLogin(): string {
  const redirect = route.query.redirect;
  if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login')) {
    return redirect;
  }
  return '/';
}

// Diarahkan ke sini karena sesi habis (lihat arahkanKeLogin di ~/utils/apiFetch.ts) - beri tahu alasannya.
onMounted(() => {
  if (route.query.alasan === 'sesi-berakhir') {
    showToast('⚠ Sesi Anda telah berakhir. Silakan masuk kembali untuk melanjutkan.', 'warning');
  }
});

const npm = ref('');
const password = ref('');
const showPassword = ref(false);
// Peringatan Caps Lock - penyebab umum "password salah" yang sering tidak disadari pengguna.
const capsLockOn = ref(false);
function cekCapsLock(event: KeyboardEvent) {
  capsLockOn.value = event.getModifierState?.('CapsLock') ?? false;
}
const isSubmitting = ref(false);
// PageLoader dipaksa tampil minimal 5 detik (lihat useMinLoading.ts) - dipakai komponen loading
// YANG SAMA dengan semua halaman lain, supaya proses autentikasi terasa seperti "halaman
// tersendiri" yang jelas, bukan cuma spinner kecil sekejap di tombol.
const isAuthenticating = useMinLoading(isSubmitting);

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
    router.replace(tujuanSetelahLogin());
  } catch (err) {
    const statusCode = (err as { statusCode?: number } | undefined)?.statusCode;
    const retryAfterSeconds = (err as { data?: { retryAfterSeconds?: number } } | undefined)?.data?.retryAfterSeconds;

    if (statusCode === 429 && typeof retryAfterSeconds === 'number') {
      startRateLimitCountdown(getApiErrorMessage(err, 'Terlalu banyak percobaan masuk.'), retryAfterSeconds);
    } else {
      showToast(getApiErrorMessage(err, 'NPM atau kata sandi yang Anda masukkan tidak sesuai.'), 'error');
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <!-- Satu kolom: kartu putih di tengah latar navy berornamen. Navy = token sidebar aplikasi,
       supaya identitas visual sama sebelum & sesudah masuk. -->
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-sidebar-bg)] px-4 py-10">
    <!-- Ornamen geometris dekoratif (murni hiasan, disembunyikan dari pembaca layar) -->
    <!-- Animasinya pelan & halus (rotasi, melayang, berdenyut) supaya halaman terasa hidup tanpa
         mengganggu fokus ke form. Dimatikan otomatis bila pengguna memilih "kurangi gerakan". -->
    <svg class="login-ornamen pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900" fill="none">
      <!-- lingkaran besar samar yang "bernapas" -->
      <circle class="orn-napas" cx="1440" cy="40" r="190" fill="#fff" opacity=".04" />
      <circle class="orn-napas orn-tunda-3" cx="1440" cy="900" r="160" fill="#fff" opacity=".04" />
      <circle class="orn-napas orn-tunda-5" cx="0" cy="900" r="130" fill="#fff" opacity=".03" />

      <!-- kiri: cincin putus-putus berputar -->
      <circle class="orn-putar" style="--durasi: 70s" cx="60" cy="40" r="110" stroke="var(--color-accent)" stroke-width="22" stroke-dasharray="6 14" opacity=".85" />
      <path class="orn-garis" d="M-40 230 C 120 230, 230 140, 250 -20" stroke="var(--color-accent)" stroke-width="2" stroke-dasharray="6 6" opacity=".7" />
      <circle class="orn-putar" style="--durasi: 18s" cx="95" cy="290" r="34" stroke="#fff" stroke-width="6" stroke-dasharray="4 7" opacity=".55" />
      <circle class="orn-putar orn-balik" style="--durasi: 45s" cx="30" cy="470" r="70" stroke="var(--color-primary-light)" stroke-width="14" stroke-dasharray="10 12" opacity=".5" />
      <path class="orn-melayang" style="--durasi: 7s" d="M20 860 l22 -22 l22 22" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".7" />

      <!-- kanan: cincin, garis putus-putus berdenyut -->
      <circle class="orn-melayang" style="--durasi: 8s" cx="1220" cy="20" r="22" stroke="#fff" stroke-width="5" opacity=".7" />
      <circle class="orn-putar orn-balik" style="--durasi: 60s" cx="1440" cy="460" r="120" stroke="var(--color-accent)" stroke-width="24" stroke-dasharray="7 13" opacity=".85" />
      <path class="orn-denyut" d="M1290 560 v26" stroke="var(--color-accent)" stroke-width="5" stroke-linecap="round" />
      <path class="orn-denyut orn-tunda-1" d="M1290 610 v26" stroke="var(--color-accent)" stroke-width="5" stroke-linecap="round" />
      <path class="orn-denyut orn-tunda-2" d="M1290 660 v26" stroke="var(--color-accent)" stroke-width="5" stroke-linecap="round" />

      <!-- bentuk kecil melayang: tanda plus, segitiga, cincin -->
      <path class="orn-melayang orn-tunda-2" style="--durasi: 9s" d="M380 150 h18 M389 141 v18" stroke="var(--color-accent)" stroke-width="3" stroke-linecap="round" opacity=".8" />
      <path class="orn-melayang orn-tunda-4" style="--durasi: 10s" d="M1060 820 h16 M1068 812 v16" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5" />
      <path class="orn-putar" style="--durasi: 24s" d="M1100 150 l14 24 h-28 z" stroke="var(--color-primary-light)" stroke-width="2.5" stroke-linejoin="round" opacity=".7" />
      <path class="orn-putar orn-balik" style="--durasi: 30s" d="M330 780 l12 20 h-24 z" stroke="var(--color-accent)" stroke-width="2.5" stroke-linejoin="round" opacity=".7" />
      <circle class="orn-melayang orn-tunda-3" style="--durasi: 11s" cx="1360" cy="190" r="9" stroke="var(--color-primary-light)" stroke-width="2.5" opacity=".7" />

      <!-- titik-titik berkelip -->
      <g fill="#fff">
        <circle class="orn-kelip" cx="300" cy="420" r="3" />
        <circle class="orn-kelip orn-tunda-2" cx="1150" cy="380" r="3" />
        <circle class="orn-kelip orn-tunda-4" cx="1320" cy="300" r="2.5" />
        <circle class="orn-kelip orn-tunda-1" cx="210" cy="700" r="2.5" />
        <circle class="orn-kelip orn-tunda-3" cx="1180" cy="760" r="3" />
        <circle class="orn-kelip orn-tunda-5" cx="720" cy="60" r="2" />
        <circle class="orn-kelip orn-tunda-2" cx="560" cy="860" r="2.5" />
        <circle class="orn-kelip orn-tunda-4" cx="900" cy="110" r="2" />
      </g>
    </svg>

    <div class="relative z-10 w-full max-w-[400px]">
      <div class="relative overflow-hidden rounded-lg bg-[var(--color-surface)] px-8 pb-8 pt-10 shadow-2xl sm:px-10">
        <!-- Overlay proses autentikasi - menutup kartu dengan status yang jelas supaya mahasiswa
             tahu proses sedang berjalan, bukan form yang diam/hang. -->
        <div
          v-if="isAuthenticating"
          class="absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-surface)]/95 backdrop-blur-sm"
        >
          <PageLoader size="lg" title="Memverifikasi akun Anda" description="Mohon tunggu sebentar." />
        </div>

        <!-- Kop: lambang + nama kampus -->
        <div class="flex flex-col items-center text-center">
          <img :src="logoUrl" :alt="`Lambang ${NAMA_KAMPUS}`" class="h-20 w-20 object-contain">
          <p class="mt-3 text-base font-bold uppercase leading-tight tracking-wide text-[var(--color-sidebar-bg)] dark:text-[var(--color-text)]">
            {{ NAMA_KAMPUS }}
          </p>
          <p class="mt-1 text-[11px] font-medium uppercase tracking-[0.25em] text-[var(--color-text-muted)]">Sistem Informasi Mahasiswa</p>
        </div>

        <div
          v-if="rateLimitMessage"
          role="alert"
          class="mt-6 flex items-start gap-3 rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2.5"
        >
          <AlarmClock :size="16" class="mt-0.5 shrink-0 text-[var(--color-danger)]" />
          <p class="text-xs font-semibold text-[var(--color-danger)]">{{ rateLimitMessage }}</p>
        </div>

        <form class="mt-8 flex flex-col gap-5" @submit.prevent="handleSubmit">
          <!-- Field dengan label "menempel" di garis atas border (notched label) -->
          <div class="relative">
            <label
              for="login-npm"
              class="absolute -top-2 left-3 bg-[var(--color-surface)] px-1 text-[11px] font-medium text-[var(--color-text-muted)]"
            >NPM</label>
            <input
              id="login-npm"
              v-model="npm"
              type="text"
              inputmode="numeric"
              autocomplete="username"
              placeholder="Masukkan NPM Anda"
              required
              class="w-full rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/70 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
            >
          </div>

          <div>
            <div class="relative">
              <label
                for="login-password"
                class="absolute -top-2 left-3 z-10 bg-[var(--color-surface)] px-1 text-[11px] font-medium text-[var(--color-text-muted)]"
              >Kata Sandi</label>
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Masukkan kata sandi Anda"
                required
                class="w-full rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface)] py-2.5 pl-3.5 pr-10 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/70 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
                @keyup="cekCapsLock"
                @keydown="cekCapsLock"
              >
              <button
                type="button"
                class="absolute inset-y-0 right-3 flex items-center text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
                :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                tabindex="-1"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" :size="17" />
                <Eye v-else :size="17" />
              </button>
            </div>
            <p v-if="capsLockOn" class="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--color-warning)]">
              <TriangleAlert :size="13" /> Caps Lock aktif
            </p>
          </div>

          <button
            type="submit"
            :disabled="isSubmitting || !!rateLimitMessage"
            class="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-sidebar-bg)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-sidebar-hover-bg)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LoaderCircle v-if="isSubmitting" :size="16" class="animate-spin" />
            Masuk
          </button>
        </form>

        <!-- Bantuan - supaya tidak jadi dead end saat lupa kata sandi -->
        <p class="mt-5 text-center text-xs text-[var(--color-primary)]">Hubungi BAAK apabila Anda lupa kata sandi.</p>
      </div>

      <p class="mt-6 text-center text-xs text-[var(--color-sidebar-text-muted)]">&copy; {{ tahunSekarang }} {{ NAMA_KAMPUS }}</p>
    </div>
  </div>
</template>

<style scoped>
/* Tiap bentuk berputar/melayang terhadap pusatnya sendiri, bukan pusat SVG. */
.login-ornamen * {
  transform-box: fill-box;
  transform-origin: center;
}

.orn-putar {
  animation: orn-putar var(--durasi, 40s) linear infinite;
}
.orn-balik {
  animation-direction: reverse;
}
.orn-melayang {
  animation: orn-melayang var(--durasi, 8s) ease-in-out infinite;
}
.orn-napas {
  animation: orn-napas 12s ease-in-out infinite;
}
.orn-denyut {
  animation: orn-denyut 2.4s ease-in-out infinite;
}
.orn-kelip {
  animation: orn-kelip 4s ease-in-out infinite;
}
.orn-garis {
  animation: orn-garis 6s linear infinite;
}

.orn-tunda-1 { animation-delay: -0.8s; }
.orn-tunda-2 { animation-delay: -1.6s; }
.orn-tunda-3 { animation-delay: -3s; }
.orn-tunda-4 { animation-delay: -4.5s; }
.orn-tunda-5 { animation-delay: -6s; }

@keyframes orn-putar {
  to { transform: rotate(360deg); }
}
@keyframes orn-melayang {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-16px) rotate(8deg); }
}
@keyframes orn-napas {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes orn-denyut {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.95; }
}
@keyframes orn-kelip {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.8; }
}
@keyframes orn-garis {
  to { stroke-dashoffset: -48; }
}

/* Hormati preferensi "kurangi gerakan" di sistem operasi pengguna. */
@media (prefers-reduced-motion: reduce) {
  .login-ornamen * {
    animation: none !important;
  }
}
</style>
