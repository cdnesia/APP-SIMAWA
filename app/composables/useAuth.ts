import * as authApi from '~/features/auth/services/api';
import type { UserProfile } from '~/features/auth/types';

// State auth dibagi lintas komponen pakai useState() bawaan Nuxt (SSR-safe shared state) -
// TIDAK PERNAH baca cookie token langsung dari sini, semua lewat Route Handler Nitro
// (server/api/auth/**) yang pegang cookie httpOnly.
export function useAuth() {
  const user = useState<UserProfile | null>('auth-user', () => null);
  const isLoading = useState('auth-loading', () => true);
  const isInitialized = useState('auth-initialized', () => false);

  async function fetchMe() {
    try {
      user.value = await authApi.getMe();
    } catch {
      user.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  // Cuma fetch sekali per lifecycle app - `isInitialized` di-set SINKRON (sebelum await) supaya
  // kalau useAuth() dipanggil dari beberapa komponen sekaligus (mis. AppLayout + halaman) di
  // render yang sama, tidak ada dua fetchMe() konkuren (JS single-thread, tidak ada interleaving
  // antara pengecekan dan penyetelan flag ini).
  if (!isInitialized.value && import.meta.client) {
    isInitialized.value = true;
    fetchMe();
  }

  async function login(npm: string, password: string) {
    const result = await authApi.login(npm, password);
    user.value = result.user;
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      user.value = null;
    }
  }

  return { user, isLoading, login, logout, fetchMe };
}
