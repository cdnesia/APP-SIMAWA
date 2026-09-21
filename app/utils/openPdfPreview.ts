// Tampilkan PDF di tab baru dulu (viewer bawaan browser) sebelum mahasiswa memutuskan unduh -
// `win` HARUS sudah dibuka lewat window.open() secara SINKRON di dalam event handler klik
// (bukan di callback async), supaya tidak diblokir popup blocker browser.
export function openPdfPreview(win: Window | null, blob: Blob) {
  const url = window.URL.createObjectURL(blob);
  if (win) {
    win.location.href = url;
  } else {
    window.open(url, '_blank');
  }
  // Jangan revoke langsung - beri waktu tab baru memuat PDF-nya sebelum object URL dicabut.
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}
