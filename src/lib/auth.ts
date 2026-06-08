import Cookies from 'js-cookie';
import { AuthResponse, CurrentUser } from './types';

const TOKEN_KEY = 'token';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';

export function saveAuth(data: AuthResponse) {
  Cookies.set(TOKEN_KEY, data.token, { expires: 1 });
  Cookies.set(REFRESH_KEY, data.refreshToken, { expires: 7 });
  Cookies.set(USER_KEY, JSON.stringify({
    username: data.username,
    fullName: data.fullName,
    role: data.role,
  }), { expires: 1 });
}

export function clearAuth() {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(REFRESH_KEY);
  Cookies.remove(USER_KEY);
}

export function getStoredUser(): { username: string; fullName: string; role: string } | null {
  const raw = Cookies.get(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!Cookies.get(TOKEN_KEY);
}
