import type { ApiSuccess } from '#shared/types';
import type { RincianTagihanAktif, Tagihan } from '../types';

// Lewat catch-all /api/simawa/* seperti fitur lain - SERVICE-SIMAWA sendiri yang panggil
// SERVICE-PUBLIC (M2M client_credentials) untuk data tagihan (dipindah dari APP-SIMAWA
// 2026-09-19 supaya cuma SERVICE-SIMAWA yang punya kredensial M2M ke service lain).
export async function cekTagihanSaya(): Promise<Tagihan[]> {
  const res = await apiFetch<ApiSuccess<Tagihan[]>>('/api/simawa/tagihan/cek');
  return res.data;
}

// Rincian tagihan tahun akademik AKTIF saja (dipakai dashboard) - beda dari cekTagihanSaya()
// yang seluruh histori. SPP disembunyikan otomatis dari sisi server kalau isPenerimaBeasiswaPenuh true.
// `kontrakKrs: true` HANYA dari halaman Kontrak KRS - server sekalian menghapus tagihan SPP TA aktif
// kalau mahasiswa penerima beasiswa penuh terverifikasi (Dashboard tidak mengirimnya).
// `buatSpp: true` HANYA dari Dashboard - server membuat tagihan SPP TA aktif otomatis kalau belum ada
// (dan mahasiswa bukan penerima beasiswa penuh terverifikasi), hasilnya di `sppDibuat`/`gagalBuatSpp`.
export async function getRincianTagihanAktif({ kontrakKrs = false, buatSpp = false } = {}): Promise<RincianTagihanAktif> {
  const query: Record<string, string> = {};
  if (kontrakKrs) query.kontrakKrs = '1';
  if (buatSpp) query.buatSpp = '1';
  const res = await apiFetch<ApiSuccess<RincianTagihanAktif>>('/api/simawa/tagihan/rincian-aktif', { query });
  return res.data;
}
