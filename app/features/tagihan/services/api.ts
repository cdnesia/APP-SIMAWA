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
// yang seluruh histori. SPP disembunyikan otomatis dari sisi server kalau isPenerimaKipk true.
export async function getRincianTagihanAktif(): Promise<RincianTagihanAktif> {
  const res = await apiFetch<ApiSuccess<RincianTagihanAktif>>('/api/simawa/tagihan/rincian-aktif');
  return res.data;
}
