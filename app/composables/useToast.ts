export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

// State toast dibagi lintas komponen pakai useState() bawaan Nuxt (SSR-safe shared state) -
// tidak perlu Provider component ala React Context, cukup 1 key global 'toasts'.
export function useToast() {
  const toasts = useState<ToastItem[]>('toasts', () => []);

  function showToast(message: string, type: ToastType = 'success') {
    const id = Date.now() + Math.random();
    toasts.value = [...toasts.value, { id, message, type }];
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 3000);
  }

  return { toasts, showToast };
}
