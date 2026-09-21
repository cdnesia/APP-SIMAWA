import type { ApiSuccess } from '#shared/types';
import type { MahasiswaProfile } from '../types';

export async function getMyProfile(): Promise<MahasiswaProfile> {
  const res = await apiFetch<ApiSuccess<MahasiswaProfile>>('/api/simawa/mahasiswa/me');
  return res.data;
}
