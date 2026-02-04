import axios from 'axios';
import { Platform } from 'react-native';

// EXPO_PUBLIC_API_URL: set in .env for physical device (e.g. http://192.168.1.x:8080).
// Android emulator: 10.0.2.2 is the host machine. iOS Simulator: localhost works.
function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'android') return 'http://10.0.2.2:8080';
  return 'http://localhost:8080';
}
const API_BASE = getApiBase();

/** User-friendly message when request fails due to connection (device can't reach backend). */
export function getConnectionErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code;
  if (code === 'ERR_NETWORK' || msg.includes('Network Error') || msg.includes('ECONNREFUSED')) {
    return "Cannot reach server. On a physical device, set EXPO_PUBLIC_API_URL in .env to your computer's IP (e.g. http://192.168.1.x:8080) and restart Expo.";
  }
  return msg;
}

/** Get error message from API response (response.data.error from backend). */
export function getApiErrorMessage(err: unknown): string | null {
  const ax = err as { response?: { data?: { error?: string; message?: string } } };
  const msg = ax.response?.data?.error ?? ax.response?.data?.message ?? null;
  return typeof msg === 'string' ? msg : null;
}

export const api = axios.create({
  baseURL: `${API_BASE}/v1`,
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export interface Patient {
  _id: string;
  fullName: string;
  gender: 'male' | 'female';
  age: number | null;
  avatarUrl: string;
  contacts: { phone: string; email: string | null; telegram: string | null };
  status: string;
  location: { city: string };
  preferences: { language: 'uz' | 'ru' | 'en'; notificationsEnabled: boolean };
  auth: { type: 'google' | 'phone' };
  createdAt: string;
  updatedAt: string;
}

export interface AuthGoogleResponse {
  token: string;
  patient: Patient;
  expiresIn: string;
}

export interface AuthPhoneResponse {
  token: string;
  patient: Patient;
  expiresIn: string;
  needsProfile?: boolean;
}

export async function authGoogle(idToken: string): Promise<AuthGoogleResponse> {
  const { data } = await api.post<{ success: boolean; data: AuthGoogleResponse }>(
    '/patients/auth/google',
    { idToken }
  );
  if (!data.success) throw new Error('Auth failed');
  return data.data;
}

export async function authPhone(
  phone: string,
  preferredLanguage: 'uz' | 'ru' | 'en' = 'uz'
): Promise<AuthPhoneResponse> {
  const { data } = await api.post<{ success: boolean; data: AuthPhoneResponse }>(
    '/patients/auth/phone',
    { phone },
    { headers: { 'X-Preferred-Language': preferredLanguage } }
  );
  if (!data.success) throw new Error('Auth failed');
  return data.data;
}

export async function authPhonePassword(
  phone: string,
  password: string,
  preferredLanguage: 'uz' | 'ru' | 'en' = 'uz'
): Promise<AuthPhoneResponse> {
  const { data } = await api.post<{ success: boolean; data: AuthPhoneResponse }>(
    '/patients/auth/phone-password',
    { phone, password },
    { headers: { 'X-Preferred-Language': preferredLanguage } }
  );
  if (!data.success) throw new Error('Auth failed');
  return data.data;
}

export async function getMe(): Promise<Patient> {
  const { data } = await api.get<{ success: boolean; data: Patient }>('/patients/me');
  if (!data.success) throw new Error('Failed to get profile');
  return data.data;
}

export async function completeProfile(body: {
  fullName: string;
  gender: 'male' | 'female';
  age: number | null;
}): Promise<Patient> {
  const { data } = await api.post<{ success: boolean; data: Patient }>(
    '/patients/me/complete',
    body
  );
  if (!data.success) throw new Error('Failed to complete profile');
  return data.data;
}

export async function updateMe(updates: Partial<{
  fullName: string;
  gender: 'male' | 'female';
  age: number | null;
  avatarUrl: string;
  contacts: { email: string | null };
  location: { city: string };
  preferences: Partial<{ language: 'uz' | 'ru' | 'en'; notificationsEnabled: boolean }>;
}>): Promise<Patient> {
  const { data } = await api.patch<{ success: boolean; data: Patient }>(
    '/patients/me',
    updates
  );
  if (!data.success) throw new Error('Failed to update profile');
  return data.data;
}
