import type { ApiSuccess } from '#shared/types';
import type { RiwayatBeasiswaItem } from '../types';

export async function getRiwayatBeasiswa(): Promise<RiwayatBeasiswaItem[]> {
  const res = await apiFetch<ApiSuccess<RiwayatBeasiswaItem[]>>('/api/simawa/mahasiswa/riwayat-beasiswa');
  return res.data;
}
