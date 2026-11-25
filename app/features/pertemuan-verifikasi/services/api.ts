import type { ApiSuccess } from '#shared/types';
import type { PertemuanVerifikasiResponse, VerifikasiPertemuanResponse } from '../types';

// Mahasiswa verifikator diambil backend dari token login (bukan dari input) - lihat /v1/saya/pertemuan-verifikasi.
export async function getPertemuanVerifikasi(): Promise<PertemuanVerifikasiResponse> {
  const res = await apiFetch<ApiSuccess<PertemuanVerifikasiResponse>>('/api/simawa/pertemuan-verifikasi');
  return res.data;
}

// Semua-atau-tidak: kalau satu saja tidak valid (bukan tugasnya, sudah terverifikasi, belum dilaksanakan) seluruhnya
// ditolak backend. Respons berisi daftar terbaru, jadi tidak perlu fetch ulang.
export async function verifikasiPertemuan(pertemuanIds: string[]): Promise<VerifikasiPertemuanResponse> {
  const res = await apiFetch<ApiSuccess<VerifikasiPertemuanResponse>>('/api/simawa/pertemuan-verifikasi', {
    method: 'POST',
    body: { pertemuanIds },
  });
  return res.data;
}
