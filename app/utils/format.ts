export function formatRupiah(value: string | number): string {
  const angka = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(angka)) return value.toString();
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
}

export function formatTanggal(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}
