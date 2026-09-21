// $fetch (ofetch) melempar FetchError, bukan AxiosError - body response error ada di `error.data`
// (sudah di-parse otomatis sesuai Content-Type, kecuali responseType: 'blob' diminta eksplisit).
export function getApiErrorMessage(error: unknown, fallback = 'Terjadi kesalahan, coba lagi'): string {
  const data = (error as { data?: { message?: string } } | undefined)?.data;
  return data?.message ?? fallback;
}

// Untuk request dengan `responseType: 'blob'` (cetak PDF, dsb) - kalau server balas error JSON,
// ofetch tetap taruh body-nya sebagai Blob di `error.data` (bukan object ke-parse), jadi
// getApiErrorMessage biasa tidak bisa baca field `message`-nya. Blob-nya perlu dibaca dulu
// sebagai teks lalu di-parse manual.
export async function getApiErrorMessageFromBlob(error: unknown, fallback = 'Terjadi kesalahan, coba lagi'): Promise<string> {
  const data = (error as { data?: unknown } | undefined)?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      // Body-nya bukan JSON valid (mis. HTML error page) - jatuh ke fallback biasa di bawah.
    }
  }
  return getApiErrorMessage(error, fallback);
}
