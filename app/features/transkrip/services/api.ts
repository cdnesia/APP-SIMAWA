import type { ApiSuccess } from '#shared/types';
import type { TranskripResponse } from '../types';

export async function getTranskrip(): Promise<TranskripResponse> {
  const res = await apiFetch<ApiSuccess<TranskripResponse>>('/api/simawa/transkrip');
  return res.data;
}

// PDF transkrip nilai sementara - dibuat REST-API-SIMAWA (nilai terbaik per mata kuliah).
export async function printTranskrip(): Promise<Blob> {
  return apiFetch<Blob>('/api/simawa/transkrip/print', { responseType: 'blob' });
}
