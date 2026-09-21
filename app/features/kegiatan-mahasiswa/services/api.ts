import type { ApiSuccess } from '#shared/types';
import type { KegiatanMahasiswaResponse, PendaftaranKegiatanResult, RiwayatKegiatanResponse } from '../types';

export async function getKegiatanMahasiswa(): Promise<KegiatanMahasiswaResponse> {
  const res = await apiFetch<ApiSuccess<KegiatanMahasiswaResponse>>('/api/simawa/kegiatan-mahasiswa');
  return res.data;
}

export async function getRiwayatKegiatanMahasiswa(): Promise<RiwayatKegiatanResponse> {
  const res = await apiFetch<ApiSuccess<RiwayatKegiatanResponse>>('/api/simawa/kegiatan-mahasiswa/riwayat');
  return res.data;
}

export async function daftarKegiatanMahasiswa(id: number): Promise<PendaftaranKegiatanResult> {
  const res = await apiFetch<ApiSuccess<PendaftaranKegiatanResult>>(`/api/simawa/kegiatan-mahasiswa/${id}/daftar`, { method: 'POST' });
  return res.data;
}
