// Tone badge berdasarkan huruf nilai. Prefix dicek dulu (A/B/C/D/E) karena variannya banyak
// (A, A-, B+, B, B-, dst) tergantung skala nilai program studi.
export function getNilaiHurufTone(huruf: string | null): 'success' | 'primary' | 'warning' | 'danger' | 'neutral' {
  if (!huruf) return 'neutral';
  const first = huruf.trim().charAt(0).toUpperCase();
  if (first === 'A') return 'success';
  if (first === 'B') return 'primary';
  if (first === 'C') return 'warning';
  if (first === 'D' || first === 'E') return 'danger';
  return 'neutral';
}

// Format nilai komponen (Decimal dari backend, datang sebagai string atau null). NULL = belum
// dinilai, angka (termasuk "0.00") = benar-benar sudah dinilai - jangan disamakan.
export function formatNilaiKomponen(value: string | null): string {
  if (value === null || value === undefined) return 'Belum dinilai';
  const num = Number(value);
  return Number.isFinite(num) ? num.toString() : value;
}
