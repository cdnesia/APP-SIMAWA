<script setup lang="ts">
import { AlarmClock, CircleAlert, Eye, EyeOff, LoaderCircle, TriangleAlert, X } from '@lucide/vue';
import logoUrl from '~/assets/logo-umjambi.png';

const NAMA_KAMPUS = 'Universitas Muhammadiyah Jambi';

const tahunSekarang = new Date().getFullYear();

const { login } = useAuth();
const router = useRouter();
const route = useRoute();

// Tujuan setelah login = ?redirect dari middleware/apiFetch, HANYA path internal ("/..." tapi bukan "//domain-lain")
// supaya tidak bisa dipakai sebagai open redirect ke situs luar.
function tujuanSetelahLogin(): string {
  const redirect = route.query.redirect;
  if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login')) {
    return redirect;
  }
  return '/';
}

const npm = ref('');
const password = ref('');

// Notifikasi halaman masuk SENGAJA tampil di DALAM kartu (bukan toast pojok kanan bawah) - pesan
// gagal masuk harus terlihat persis di dekat form yang perlu diperbaiki, dan tidak hilang sendiri
// sebelum sempat dibaca. Hilang saat pengguna mulai mengetik ulang atau menutupnya.
type Notifikasi = { tipe: 'error' | 'warning'; judul: string; pesan: string };
const notifikasi = ref<Notifikasi | null>(null);
const fieldError = computed(() => notifikasi.value?.tipe === 'error');

watch([npm, password], () => {
  if (notifikasi.value?.tipe === 'error') notifikasi.value = null;
});

// Diarahkan ke sini karena sesi habis (lihat arahkanKeLogin di ~/utils/apiFetch.ts) - beri tahu alasannya.
onMounted(() => {
  if (route.query.alasan === 'sesi-berakhir') {
    notifikasi.value = {
      tipe: 'warning',
      judul: 'Sesi Anda telah berakhir',
      pesan: 'Demi keamanan akun, silakan masuk kembali untuk melanjutkan.',
    };
  }
});
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

  return `Demi keamanan akun, Anda dapat mencoba lagi dalam ${sisa}.`;
});

// Pesan gagal masuk ditulis ulang per kondisi dengan bahasa yang ramah & menenangkan - pesan mentah
// dari backend ("Unauthorized", "NPM atau password salah") terasa kaku/menyalahkan pengguna.
function pesanGagalMasuk(err: unknown): Notifikasi {
  const e = err as { statusCode?: number; status?: number } | undefined;
  const statusCode = e?.statusCode ?? e?.status;

  if (statusCode === 401) {
    return {
      tipe: 'error',
      judul: 'Nomor Pokok Mahasiswa atau kata sandi belum sesuai',
      pesan: 'Silakan periksa kembali Nomor Pokok Mahasiswa dan kata sandi Anda, lalu coba lagi.',
    };
  }
  if (statusCode === 403) {
    return {
      tipe: 'error',
      judul: 'Akun belum dapat digunakan',
      pesan: getApiErrorMessage(err, 'Akun ini belum memiliki akses ke SIMAWA. Silakan hubungi BAAK untuk bantuan.'),
    };
  }
  if (statusCode === 422) {
    return { tipe: 'warning', judul: 'Data belum lengkap', pesan: 'Mohon isi Nomor Pokok Mahasiswa dan kata sandi terlebih dahulu.' };
  }
  if (!statusCode || statusCode >= 500) {
    return {
      tipe: 'error',
      judul: 'Belum dapat terhubung',
      pesan: 'Kami belum dapat menghubungi server. Periksa koneksi internet Anda, lalu coba beberapa saat lagi.',
    };
  }
  return {
    tipe: 'error',
    judul: 'Belum berhasil masuk',
    pesan: getApiErrorMessage(err, 'Terjadi kendala saat memproses permintaan Anda. Silakan coba lagi.'),
  };
}

// Kartu "bergoyang" singkat saat gagal masuk - umpan balik yang terasa, bukan cuma teks merah.
const goyang = ref(false);
function goyangkanKartu() {
  goyang.value = false;
  requestAnimationFrame(() => (goyang.value = true));
}

// Parallax halus: ornamen latar bergeser sedikit mengikuti kursor (hanya perangkat dengan mouse).
// Ditulis ke CSS variable + transisi CSS, jadi gerakannya lembut dan tidak memicu render ulang Vue.
const akarHalaman = ref<HTMLElement | null>(null);
let rafParallax = 0;
function gerakParallax(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || !akarHalaman.value) return;
  cancelAnimationFrame(rafParallax);
  rafParallax = requestAnimationFrame(() => {
    const el = akarHalaman.value;
    if (!el) return;
    el.style.setProperty('--px', (event.clientX / window.innerWidth - 0.5).toFixed(3));
    el.style.setProperty('--py', (event.clientY / window.innerHeight - 0.5).toFixed(3));
  });
}
onUnmounted(() => cancelAnimationFrame(rafParallax));

async function handleSubmit() {
  notifikasi.value = null;
  isSubmitting.value = true;
  try {
    await login(npm.value, password.value);
    router.replace(tujuanSetelahLogin());
  } catch (err) {
    const statusCode = (err as { statusCode?: number } | undefined)?.statusCode;
    const retryAfterSeconds = (err as { data?: { retryAfterSeconds?: number } } | undefined)?.data?.retryAfterSeconds;

    if (statusCode === 429 && typeof retryAfterSeconds === 'number') {
      startRateLimitCountdown(getApiErrorMessage(err, 'Terlalu banyak percobaan masuk.'), retryAfterSeconds);
      goyangkanKartu();
    } else {
      notifikasi.value = pesanGagalMasuk(err);
      goyangkanKartu();
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <!-- Satu kolom: kartu putih di tengah latar navy berornamen. Navy = token sidebar aplikasi,
       supaya identitas visual sama sebelum & sesudah masuk. -->
  <div
    ref="akarHalaman"
    class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[var(--color-sidebar-bg)] px-4 py-8 sm:py-10"
    @pointermove="gerakParallax"
  >
    <!-- Ornamen geometris dekoratif (murni hiasan, disembunyikan dari pembaca layar) -->
    <!-- Animasinya pelan & halus (rotasi, melayang, berdenyut) supaya halaman terasa hidup tanpa
         mengganggu fokus ke form. Dimatikan otomatis bila pengguna memilih "kurangi gerakan". -->
    <svg class="login-ornamen orn-parallax pointer-events-none absolute inset-0 hidden h-full w-full sm:block" aria-hidden="true" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900" fill="none">
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

    <!-- Ornamen versi HP - di layar tegak ornamen desktop terpotong keluar layar, jadi dibuat set
         kecil sendiri di sudut-sudut supaya tetap terasa hidup tanpa menutupi kartu. -->
    <svg class="login-ornamen pointer-events-none absolute inset-x-0 top-0 h-56 w-full sm:hidden" aria-hidden="true" preserveAspectRatio="xMidYMin slice" viewBox="0 0 400 220" fill="none">
      <circle class="orn-putar" style="--durasi: 60s" cx="20" cy="20" r="70" stroke="var(--color-accent)" stroke-width="14" stroke-dasharray="5 10" opacity=".85" />
      <circle class="orn-melayang" style="--durasi: 8s" cx="345" cy="45" r="14" stroke="#fff" stroke-width="4" opacity=".6" />
      <path class="orn-melayang orn-tunda-2" style="--durasi: 9s" d="M290 120 h14 M297 113 v14" stroke="var(--color-accent)" stroke-width="3" stroke-linecap="round" opacity=".8" />
      <g fill="#fff">
        <circle class="orn-kelip" cx="200" cy="40" r="2" />
        <circle class="orn-kelip orn-tunda-2" cx="40" cy="170" r="2" />
      </g>
    </svg>
    <svg class="login-ornamen pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full sm:hidden" aria-hidden="true" preserveAspectRatio="xMidYMax slice" viewBox="0 0 400 220" fill="none">
      <circle class="orn-putar orn-balik" style="--durasi: 50s" cx="390" cy="210" r="80" stroke="var(--color-accent)" stroke-width="14" stroke-dasharray="5 10" opacity=".8" />
      <circle class="orn-putar orn-balik" style="--durasi: 35s" cx="10" cy="130" r="45" stroke="var(--color-primary-light)" stroke-width="9" stroke-dasharray="7 9" opacity=".5" />
      <path class="orn-putar" style="--durasi: 24s" d="M90 185 l10 17 h-20 z" stroke="#fff" stroke-width="2" stroke-linejoin="round" opacity=".5" />
      <g fill="#fff">
        <circle class="orn-kelip orn-tunda-4" cx="360" cy="60" r="2" />
        <circle class="orn-kelip orn-tunda-3" cx="200" cy="200" r="2" />
      </g>
    </svg>

    <div class="kartu-muncul relative z-10 w-full max-w-[400px]">
      <div
        :class="{ 'kartu-goyang': goyang }"
        class="relative overflow-hidden rounded-2xl bg-[var(--color-surface)] px-5 pb-6 pt-8 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] sm:px-10 sm:pb-8 sm:pt-10"
        @animationend.self="goyang = false"
      >
        <!-- Overlay proses autentikasi - menutup kartu dengan status yang jelas supaya mahasiswa
             tahu proses sedang berjalan, bukan form yang diam/hang. -->
        <Transition name="pudar">
          <div
            v-if="isAuthenticating"
            class="absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-surface)]/95 backdrop-blur-sm"
          >
            <PageLoader size="lg" title="Memverifikasi akun Anda" description="Mohon tunggu sebentar." />
          </div>
        </Transition>

        <!-- Kop: lambang + nama kampus -->
        <div class="muncul-bertahap flex flex-col items-center text-center" style="--urutan: 1">
          <img :src="logoUrl" :alt="`Lambang ${NAMA_KAMPUS}`" class="h-16 w-16 object-contain sm:h-20 sm:w-20">
          <p class="mt-3 text-sm font-bold uppercase leading-snug tracking-wide sm:text-base text-[var(--color-sidebar-bg)] dark:text-[var(--color-text)]">
            {{ NAMA_KAMPUS }}
          </p>
          <p class="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] sm:text-[11px] sm:tracking-[0.25em] text-[var(--color-text-muted)]">Sistem Informasi Mahasiswa</p>
        </div>

        <Transition name="notif">
        <div
          v-if="rateLimitMessage"
          role="status"
          class="mt-6 flex items-start gap-2.5 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-2.5 text-[var(--color-warning)]"
        >
          <AlarmClock :size="16" class="mt-0.5 shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold">Terlalu banyak percobaan masuk</p>
            <p class="mt-0.5 text-xs leading-relaxed opacity-90">{{ rateLimitMessage }}</p>
          </div>
        </div>
        </Transition>

        <Transition name="notif">
          <div
            v-if="notifikasi && !rateLimitMessage"
            :role="notifikasi.tipe === 'error' ? 'alert' : 'status'"
            :class="[
              'mt-6 flex items-start gap-2.5 rounded-lg border px-3 py-2.5',
              notifikasi.tipe === 'error'
                ? 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                : 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
            ]"
          >
            <CircleAlert v-if="notifikasi.tipe === 'error'" :size="16" class="mt-0.5 shrink-0" />
            <TriangleAlert v-else :size="16" class="mt-0.5 shrink-0" />
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold">{{ notifikasi.judul }}</p>
              <p class="mt-0.5 break-words text-xs leading-relaxed opacity-90">{{ notifikasi.pesan }}</p>
            </div>
            <button type="button" class="-m-1 shrink-0 rounded p-1 opacity-70 transition-opacity hover:opacity-100" aria-label="Tutup notifikasi" @click="notifikasi = null">
              <X :size="14" />
            </button>
          </div>
        </Transition>

        <form class="mt-6 flex flex-col gap-5 sm:mt-8" @submit.prevent="handleSubmit">
          <!-- Field dengan label "menempel" di garis atas border (notched label) -->
          <div class="muncul-bertahap group relative" style="--urutan: 2">
            <label
              for="login-npm"
              class="absolute -top-2 left-3 bg-[var(--color-surface)] px-1 text-[11px] font-medium text-[var(--color-text-muted)] transition-colors duration-200 group-focus-within:text-[var(--color-primary)]"
            >Nomor Pokok Mahasiswa</label>
            <input
              id="login-npm"
              v-model="npm"
              type="text"
              inputmode="numeric"
              autocomplete="username"
              placeholder="Masukkan Nomor Pokok Mahasiswa"
              required
              :class="{ 'border-[var(--color-danger)]': fieldError }"
              class="w-full rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-[var(--color-text-muted)]/70 hover:border-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/15"
            >
          </div>

          <div class="muncul-bertahap" style="--urutan: 3">
            <div class="group relative">
              <label
                for="login-password"
                class="absolute -top-2 left-3 z-10 bg-[var(--color-surface)] px-1 text-[11px] font-medium text-[var(--color-text-muted)] transition-colors duration-200 group-focus-within:text-[var(--color-primary)]"
              >Kata Sandi</label>
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Masukkan kata sandi"
                required
                :class="{ 'border-[var(--color-danger)]': fieldError }"
              class="w-full rounded-lg border border-[var(--color-border-dark)] bg-[var(--color-surface)] py-2.5 pl-3.5 pr-10 text-sm text-[var(--color-text)] transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-[var(--color-text-muted)]/70 hover:border-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/15"
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
                <Transition name="ikon" mode="out-in">
                  <EyeOff v-if="showPassword" :size="17" />
                  <Eye v-else :size="17" />
                </Transition>
              </button>
            </div>
            <Transition name="notif">
              <p v-if="capsLockOn" class="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--color-warning)]">
                <TriangleAlert :size="13" /> Caps Lock sedang aktif
              </p>
            </Transition>
          </div>

          <button
            type="submit"
            :disabled="isSubmitting || !!rateLimitMessage"
            style="--urutan: 4"
            class="muncul-bertahap mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-sidebar-bg)] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[var(--color-sidebar-hover-bg)] hover:shadow-lg hover:shadow-[var(--color-sidebar-bg)]/30 active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            <LoaderCircle v-if="isSubmitting" :size="16" class="animate-spin" />
            Masuk
          </button>
        </form>

        <!-- Bantuan - supaya tidak jadi dead end saat lupa kata sandi -->
        <p class="muncul-bertahap mt-5 text-center text-xs leading-relaxed text-[var(--color-primary)]" style="--urutan: 5">Hubungi BAAK apabila Anda lupa kata sandi.</p>
      </div>

      <p class="muncul-bertahap mt-6 text-center text-xs text-[var(--color-sidebar-text-muted)]" style="--urutan: 6">&copy; {{ tahunSekarang }} {{ NAMA_KAMPUS }}</p>
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

/* ===== Masuk halaman: kartu naik pelan lalu isinya muncul berurutan ===== */
.kartu-muncul {
  animation: kartu-muncul 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.muncul-bertahap {
  animation: muncul-bertahap 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(0.15s + var(--urutan, 0) * 0.07s);
}
@keyframes kartu-muncul {
  from { opacity: 0; transform: translateY(24px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
@keyframes muncul-bertahap {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}

/* Goyang singkat saat gagal masuk */
.kartu-goyang {
  animation: kartu-goyang 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
@keyframes kartu-goyang {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-6px); }
  40%, 60% { transform: translateX(6px); }
}

/* Parallax ornamen mengikuti kursor - transisi panjang supaya terasa "mengambang" */
.orn-parallax {
  transform: translate3d(calc(var(--px, 0) * -24px), calc(var(--py, 0) * -24px), 0);
  transition: transform 1.2s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

/* Overlay loading memudar, ikon mata berganti dengan skala */
.pudar-enter-active,
.pudar-leave-active {
  transition: opacity 0.3s ease;
}
.pudar-enter-from,
.pudar-leave-to {
  opacity: 0;
}
.ikon-enter-active,
.ikon-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.ikon-enter-from,
.ikon-leave-to {
  opacity: 0;
  transform: scale(0.6) rotate(-20deg);
}

/* Notifikasi di kartu muncul dengan geser-turun singkat supaya perhatian tertuju ke pesannya. */
.notif-enter-active,
.notif-leave-active {
  transition: opacity 0.25s cubic-bezier(0.22, 1, 0.36, 1), transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.notif-enter-from,
.notif-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Hormati preferensi "kurangi gerakan" di sistem operasi pengguna. */
@media (prefers-reduced-motion: reduce) {
  .login-ornamen *,
  .kartu-muncul,
  .muncul-bertahap,
  .kartu-goyang {
    animation: none !important;
  }
  .orn-parallax {
    transform: none;
  }
}
</style>
