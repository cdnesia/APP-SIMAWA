<script setup lang="ts">
import {
  Award,
  Banknote,
  Briefcase,
  BookMarked,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileBarChart,
  Flag,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  Users2,
  X,
} from '@lucide/vue';

// Semua path di sini adalah leaf route, jadi pencocokan halaman aktif/judul pakai exact match.
// Dikelompokkan mengikuti pola project SIMAWA-REACTJS (navConfig.ts): grup tanpa label buat menu
// utama, lalu grup berlabel per kategori - beda dari SIMAWA-REACTJS yang juga punya menu lain
// (Biodata, Riwayat Beasiswa, Wisuda), yang di sini SENGAJA belum ditambahkan karena halamannya
// memang belum dibangun di APP-SIMAWA - menambah entri untuk fitur yang tidak ada cuma bikin
// dead link.
const NAV_GROUPS = [
  {
    label: '',
    items: [{ label: 'Dashboard', icon: LayoutDashboard, path: '/', enabled: true }],
  },
  {
    label: 'Akademik',
    items: [
      { label: 'Jadwal Kuliah', icon: CalendarDays, path: '/jadwal-kuliah', enabled: true },
      { label: 'KRS', icon: ClipboardList, path: '/krs', enabled: true },
      { label: 'KHS', icon: BookMarked, path: '/khs', enabled: true },
      { label: 'Transkrip Nilai', icon: FileBarChart, path: '/transkrip', enabled: false },
    ],
  },
  {
    label: 'Pendaftaran',
    items: [
      { label: 'KKN', icon: Flag, path: '/pendaftaran/kkn', enabled: true },
      { label: 'PKL', icon: Briefcase, path: '/pendaftaran/pkl', enabled: true },
      { label: 'Seminar Proposal', icon: Users, path: '/pendaftaran/seminar', enabled: true },
      { label: 'Sidang Tugas Akhir', icon: Award, path: '/pendaftaran/sidang', enabled: true },
    ],
  },
  {
    label: 'Keuangan',
    items: [{ label: 'Riwayat Tagihan', icon: Banknote, path: '/tagihan', enabled: true }],
  },
  {
    label: 'Lainnya',
    items: [{ label: 'Kegiatan Mahasiswa', icon: Users2, path: '/kegiatan-mahasiswa', enabled: false }],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function isActive(path: string, pathname: string) {
  // Sama seperti NavLink `end={path === '/'}` di versi react-router lama - "/" exact match,
  // path lain match prefix (mis. "/krs" tetap aktif di "/krs/kontrak").
  return path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);
}

const route = useRoute();
const router = useRouter();
const { user, logout } = useAuth();
const { showToast } = useToast();

const isMobileNavOpen = ref(false);
const isUserMenuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

function handleClickOutside(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    isUserMenuOpen.value = false;
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside));

async function handleLogout() {
  try {
    await logout();
    showToast('Berhasil logout', 'success');
    router.replace('/login');
  } catch {
    showToast('Gagal logout. Coba lagi.', 'error');
  }
}

const initials = computed(() => (user.value ? getInitials(user.value.name) : ''));
const pageTitle = computed(() => NAV_ITEMS.find((item) => item.path === route.path)?.label ?? 'SIMAWA');
</script>

<template>
  <div class="h-screen overflow-hidden bg-[var(--color-bg)] lg:flex">
    <!-- Sidebar desktop - diam di tempat, tidak ikut scroll. Navy gelap + aksen kuning sengaja
         konstan (tidak ikut tema terang/gelap konten) supaya jadi elemen branding yang stabil. -->
    <aside class="hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-bg)] lg:flex">
      <div class="flex shrink-0 items-center gap-2.5 px-5 py-6">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
          <GraduationCap :size="20" />
        </div>
        <div>
          <h1 class="text-base font-bold leading-tight text-[var(--color-sidebar-text)]">SIMAWA</h1>
          <p class="text-xs leading-tight text-[var(--color-sidebar-text-muted)]">Sistem Informasi Mahasiswa</p>
        </div>
      </div>

      <nav class="flex flex-col overflow-y-auto px-3">
        <div v-for="group in NAV_GROUPS" :key="group.label || 'root'" class="mb-4">
          <p v-if="group.label" class="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-sidebar-text-muted)]">
            {{ group.label }}
          </p>
          <div class="flex flex-col gap-1">
            <template v-for="item in group.items" :key="item.label">
              <NuxtLink
                v-if="item.enabled"
                :to="item.path"
                :class="[
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.path, route.path)
                    ? 'bg-[var(--color-sidebar-active-bg)] text-[var(--color-sidebar-active-text)]'
                    : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover-bg)]',
                ]"
              >
                <component :is="item.icon" :size="18" class="shrink-0" />
                <span class="flex-1">{{ item.label }}</span>
              </NuxtLink>
              <button
                v-else
                disabled
                title="Segera hadir"
                class="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--color-sidebar-text-muted)]"
              >
                <component :is="item.icon" :size="18" class="shrink-0" />
                <span class="flex-1">{{ item.label }}</span>
                <span class="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-sidebar-text-muted)]">
                  segera
                </span>
              </button>
            </template>
          </div>
        </div>
      </nav>
    </aside>

    <!-- Sidebar mobile (drawer) -->
    <div v-if="isMobileNavOpen" class="fixed inset-0 z-40 lg:hidden">
      <div class="absolute inset-0 cursor-pointer bg-black/40" @click="isMobileNavOpen = false" />
      <aside class="absolute inset-y-0 left-0 flex w-72 flex-col bg-[var(--color-sidebar-bg)] shadow-lg">
        <div class="flex shrink-0 items-center justify-between px-3 pt-3">
          <span />
          <button
            class="rounded-lg p-2 text-[var(--color-sidebar-text-muted)] hover:bg-[var(--color-sidebar-hover-bg)]"
            aria-label="Tutup menu"
            @click="isMobileNavOpen = false"
          >
            <X :size="20" />
          </button>
        </div>
        <nav class="flex flex-col overflow-y-auto px-3">
          <div v-for="group in NAV_GROUPS" :key="group.label || 'root-mobile'" class="mb-4">
            <p v-if="group.label" class="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-sidebar-text-muted)]">
              {{ group.label }}
            </p>
            <div class="flex flex-col gap-1">
              <template v-for="item in group.items" :key="item.label">
                <NuxtLink
                  v-if="item.enabled"
                  :to="item.path"
                  :class="[
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item.path, route.path)
                      ? 'bg-[var(--color-sidebar-active-bg)] text-[var(--color-sidebar-active-text)]'
                      : 'text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-hover-bg)]',
                  ]"
                  @click="isMobileNavOpen = false"
                >
                  <component :is="item.icon" :size="18" class="shrink-0" />
                  <span class="flex-1">{{ item.label }}</span>
                </NuxtLink>
                <button
                  v-else
                  disabled
                  title="Segera hadir"
                  class="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--color-sidebar-text-muted)]"
                >
                  <component :is="item.icon" :size="18" class="shrink-0" />
                  <span class="flex-1">{{ item.label }}</span>
                  <span class="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-sidebar-text-muted)]">
                    segera
                  </span>
                </button>
              </template>
            </div>
          </div>
        </nav>
      </aside>
    </div>

    <div class="flex h-screen flex-1 flex-col overflow-hidden">
      <!-- Navbar - diam di tempat, tidak ikut scroll -->
      <header class="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-6">
        <button
          class="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] lg:hidden"
          aria-label="Buka menu"
          @click="isMobileNavOpen = true"
        >
          <Menu :size="20" />
        </button>

        <h2 class="hidden text-base font-semibold text-[var(--color-text)] sm:block">{{ pageTitle }}</h2>

        <div ref="userMenuRef" class="relative ml-auto">
          <button
            aria-haspopup="menu"
            :aria-expanded="isUserMenuOpen"
            class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--color-bg)]"
            @click="isUserMenuOpen = !isUserMenuOpen"
          >
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
              {{ initials }}
            </div>
            <span class="hidden text-sm font-medium text-[var(--color-text)] sm:block">{{ user?.name }}</span>
            <ChevronDown
              :size="16"
              :class="['hidden shrink-0 text-[var(--color-text-muted)] transition-transform sm:block', isUserMenuOpen ? 'rotate-180' : '']"
            />
          </button>

          <div
            v-if="isUserMenuOpen"
            role="menu"
            class="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 shadow-lg"
          >
            <div class="border-b border-[var(--color-border)] px-4 py-2.5">
              <p class="truncate text-sm font-semibold text-[var(--color-text)]">{{ user?.name }}</p>
              <p class="truncate text-xs text-[var(--color-text-muted)]">{{ user?.email }}</p>
            </div>
            <button
              role="menuitem"
              class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
              @click="handleLogout"
            >
              <LogOut :size="16" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <!-- Konten - satu-satunya area yang scroll -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
