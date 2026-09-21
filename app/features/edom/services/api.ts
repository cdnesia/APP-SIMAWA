import type { ApiSuccess } from '#shared/types';
import type { EdomFormResponse, EdomJawabanPayload } from '../types';

export async function getFormEdom(jadwalId: string): Promise<EdomFormResponse> {
  const res = await apiFetch<ApiSuccess<EdomFormResponse>>(`/api/simawa/edom/${jadwalId}`);
  return res.data;
}

export async function simpanJawabanEdom(jadwalId: string, jawaban: EdomJawabanPayload[]): Promise<void> {
  await apiFetch<ApiSuccess<null>>(`/api/simawa/edom/${jadwalId}`, { method: 'POST', body: { jawaban } });
}
