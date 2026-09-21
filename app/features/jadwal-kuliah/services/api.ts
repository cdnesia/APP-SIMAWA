import type { ApiSuccess } from '#shared/types';
import type { JadwalKuliahResponse } from '../types';

export async function getJadwalKuliah(): Promise<JadwalKuliahResponse> {
  const res = await apiFetch<ApiSuccess<JadwalKuliahResponse>>('/api/simawa/jadwal-kuliah');
  return res.data;
}
