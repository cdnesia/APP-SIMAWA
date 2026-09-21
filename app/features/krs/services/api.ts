import type { ApiSuccess } from '#shared/types';
import type { JadwalTersediaResponse, KrsResponse, KrsRiwayatResponse } from '../types';

export async function getMyKrs(kodeTahunAkademik?: string): Promise<KrsResponse> {
  const res = await apiFetch<ApiSuccess<KrsResponse>>('/api/simawa/krs', { query: { kodeTahunAkademik } });
  return res.data;
}

export async function getRiwayatKrs(): Promise<KrsRiwayatResponse> {
  const res = await apiFetch<ApiSuccess<KrsRiwayatResponse>>('/api/simawa/krs/riwayat');
  return res.data;
}

export async function getJadwalTersedia(): Promise<JadwalTersediaResponse> {
  const res = await apiFetch<ApiSuccess<JadwalTersediaResponse>>('/api/simawa/krs/jadwal-tersedia');
  return res.data;
}

export async function kontrakKrs(jadwalIds: string[]): Promise<KrsResponse> {
  const res = await apiFetch<ApiSuccess<KrsResponse>>('/api/simawa/krs', { method: 'POST', body: { jadwalIds } });
  return res.data;
}

export async function batalkanKrs(jadwalId: string): Promise<KrsResponse> {
  const res = await apiFetch<ApiSuccess<KrsResponse>>(`/api/simawa/krs/${jadwalId}`, { method: 'DELETE' });
  return res.data;
}

export async function printKrs(kodeTahunAkademik?: string): Promise<Blob> {
  return apiFetch<Blob>('/api/simawa/krs/print', { query: { kodeTahunAkademik }, responseType: 'blob' });
}
