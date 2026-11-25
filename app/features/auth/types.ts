export interface UserProfile {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

// Token login TIDAK dikirim ke browser - disimpan di cookie httpOnly Nitro (server/api/auth/login.post.ts).
export interface LoginResult {
  user: UserProfile;
}
