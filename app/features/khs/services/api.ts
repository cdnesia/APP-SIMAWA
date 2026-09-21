import type { ApiSuccess } from '#shared/types';
import type { IpkTrendResponse, KhsResponse, KhsRiwayatResponse } from '../types';

export async function getMyKhs(): Promise<KhsResponse> {
  const res = await apiFetch<ApiSuccess<KhsResponse>>('/api/simawa/khs');
  return res.data;
}

export async function getRiwayatKhs(): Promise<KhsRiwayatResponse> {
  const res = await apiFetch<ApiSuccess<KhsRiwayatResponse>>('/api/simawa/khs/riwayat');
  return res.data;
}

export async function getIpkTrend(): Promise<IpkTrendResponse> {
  const res = await apiFetch<ApiSuccess<IpkTrendResponse>>('/api/simawa/khs/ipk-trend');
  return res.data;
}

export async function printKhs(kodeTahunAkademik?: string): Promise<Blob> {
  return apiFetch<Blob>('/api/simawa/khs/print', { query: { kodeTahunAkademik }, responseType: 'blob' });
}
