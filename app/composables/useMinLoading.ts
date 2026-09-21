import type { Ref } from 'vue';

// Requirement produk: SEMUA halaman tampil loading minimal sesaat supaya pengalaman "sedang
// memuat" terasa konsisten di mana pun (bukan soal performa nyata - data API sering datang <1
// detik, apalagi lokal, dan skeleton/spinner yang cuma kedip sekejap terasa seperti glitch).
// Sempat dicoba 5 detik, dirasa terlalu lama untuk dialami tiap kali pindah halaman/login -
// dipersingkat supaya tetap kelihatan tanpa bikin nunggu lama.
const MIN_MS = 1200;

// Bungkus ref `pending` (dari useAsyncData) atau flag loading manual manapun - begitu jadi true,
// isVisible ikut true SEKETIKA (spinner harus langsung muncul), tapi begitu sumbernya balik ke
// false, isVisible ditahan true sampai genap MIN_MS sejak PERTAMA KALI muncul.
export function useMinLoading(source: Ref<boolean>) {
  const isVisible = ref(source.value);
  let shownAt = source.value ? Date.now() : 0;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  watch(
    source,
    (isActive) => {
      clearTimeout(hideTimer);

      if (isActive) {
        shownAt = Date.now();
        isVisible.value = true;
        return;
      }

      const remaining = Math.max(0, MIN_MS - (Date.now() - shownAt));
      hideTimer = setTimeout(() => {
        isVisible.value = false;
      }, remaining);
    },
    { immediate: true },
  );

  onUnmounted(() => clearTimeout(hideTimer));

  return isVisible;
}
