export interface UserProfile {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface LoginResult {
  user: UserProfile;
  accessToken: string;
}
