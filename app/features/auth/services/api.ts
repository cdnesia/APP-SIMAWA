import type { ApiSuccess } from '#shared/types';
import type { LoginResult, UserProfile } from '../types';

export async function login(npm: string, password: string): Promise<LoginResult> {
  const res = await apiFetch<ApiSuccess<LoginResult>>('/api/auth/login', {
    method: 'POST',
    body: { email: npm, password },
  });
  return res.data;
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<UserProfile> {
  const res = await apiFetch<ApiSuccess<UserProfile>>('/api/auth/me');
  return res.data;
}
