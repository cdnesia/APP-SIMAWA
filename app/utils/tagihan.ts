import type { Tagihan } from '#shared/types/tagihan';

// `nominal_ditagih` di tabel `tagihan` PAYMENT = SISA yang dibaca bank (bukan total tagihan), dan
// dikosongkan jadi 0 begitu lunas - JANGAN dibandingkan dengan `nominal_terbayar`, karena tagihan
// yang baru dibayar sebagian (terbayar >= sisa) akan terbaca "lunas". Nominal asli tagihan yang
// stabil = total_tagihan - total_potongan (rumus yang sama dipakai gerbang SPP kontrak KRS di
// SERVICE-SIMAWA::getRincianTagihanAktif).
export function totalTagihanBersih(t: Tagihan): number {
  return Number(t.total_tagihan) - Number(t.total_potongan);
}

export function sisaTagihan(t: Tagihan): number {
  return Math.max(totalTagihanBersih(t) - Number(t.nominal_terbayar), 0);
}

export function isTagihanLunas(t: Tagihan): boolean {
  return sisaTagihan(t) <= 0;
}
