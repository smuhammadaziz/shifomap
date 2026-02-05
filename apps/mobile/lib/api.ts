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

// --- Public services (no auth required) ---

export interface PublicServiceItem {
  _id: string;
  clinicId: string;
  clinicDisplayName: string;
  title: string;
  description: string;
  serviceImage: string | null;
  categoryId: string;
  categoryName: string;
  durationMin: number;
  price: { amount?: number; minAmount?: number; maxAmount?: number; currency: string };
  isActive: boolean;
}

export interface ServiceFilters {
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  durationMin?: number;
  clinicId?: string;
}

export interface ServiceFilterOptions {
  categories: { _id: string; name: string }[];
  minPrice: number | null;
  maxPrice: number | null;
  minDuration: number | null;
  maxDuration: number | null;
}

export interface ServiceSearchResult {
  services: PublicServiceItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ServiceDetailResponse {
  service: PublicServiceItem & {
    branchIds: string[];
    doctorIds: string[];
    branchNames?: string[];
    doctorNames?: string[];
  };
  clinic: { _id: string; clinicDisplayName: string; clinicUniqueName: string };
}

export async function searchServicesSuggest(q: string, limit = 15): Promise<ServiceSearchResult> {
  const { data } = await api.get<{ success: boolean; data: ServiceSearchResult }>(
    '/clinics/public/services/search',
    { params: { q: q.trim(), limit } }
  );
  if (!data.success) throw new Error('Search failed');
  return data.data;
}

export async function getServiceFilterOptions(): Promise<ServiceFilterOptions> {
  const { data } = await api.get<{ success: boolean; data: ServiceFilterOptions }>(
    '/clinics/public/services/filters'
  );
  if (!data.success) throw new Error('Failed to load filters');
  return data.data;
}

export async function searchServicesWithFilters(
  filters: ServiceFilters,
  page = 1,
  limit = 20
): Promise<ServiceSearchResult> {
  const params: Record<string, string | number> = { page, limit };
  if (filters.q) params.q = filters.q;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.minPrice != null) params.minPrice = filters.minPrice;
  if (filters.maxPrice != null) params.maxPrice = filters.maxPrice;
  if (filters.durationMin != null) params.durationMin = filters.durationMin;
  if (filters.clinicId) params.clinicId = filters.clinicId;
  const { data } = await api.get<{ success: boolean; data: ServiceSearchResult }>(
    '/clinics/public/services',
    { params }
  );
  if (!data.success) throw new Error('Search failed');
  return data.data;
}

export async function getServiceById(serviceId: string): Promise<ServiceDetailResponse> {
  const { data } = await api.get<{ success: boolean; data: ServiceDetailResponse }>(
    `/clinics/public/services/${serviceId}`
  );
  if (!data.success) throw new Error('Service not found');
  return data.data;
}

export async function getClinicServices(clinicId: string): Promise<PublicServiceItem[]> {
  const { data } = await api.get<{ success: boolean; data: { services: PublicServiceItem[] } }>(
    `/clinics/public/clinics/${clinicId}/services`
  );
  if (!data.success) throw new Error('Failed to load services');
  return data.data.services;
}

// --- Clinic detail (public) ---

export interface ClinicBranchPublic {
  _id: string;
  name: string;
  phone: string;
  address: { city: string; street: string; geo: { lat: number; lng: number } };
  workingHours: Array<{ day: number; from: string; to: string }>;
  isActive: boolean;
}

export interface ClinicDoctorPublic {
  _id: string;
  fullName: string;
  specialty: string;
  bio: string;
  avatarUrl: string | null;
  serviceIds: string[];
  branchIds: string[];
  isActive: boolean;
  schedule: { timezone: string; weekly: Array<{ day: number; from: string; to: string; lunchFrom?: string; lunchTo?: string }> };
}

export interface ClinicServicePublic {
  _id: string;
  title: string;
  description: string;
  serviceImage: string | null;
  categoryId: string;
  durationMin: number;
  price: { amount?: number; minAmount?: number; maxAmount?: number; currency: string };
  branchIds: string[];
  doctorIds: string[];
  isActive: boolean;
}

export interface ClinicDetailPublic {
  _id: string;
  clinicDisplayName: string;
  clinicUniqueName: string;
  status: string;
  branding: { logoUrl: string | null; coverUrl: string | null };
  contacts: { phone: string | null; email: string | null; telegram: string | null };
  description: { short: string | null; full: string | null };
  branches: ClinicBranchPublic[];
  services: ClinicServicePublic[];
  doctors: ClinicDoctorPublic[];
  categories: Array<{ _id: string; name: string }>;
  rating: { avg: number; count: number };
}

export async function getClinicDetail(clinicId: string): Promise<ClinicDetailPublic> {
  const { data } = await api.get<{ success: boolean; data: ClinicDetailPublic }>(
    `/clinics/public/clinics/${clinicId}`
  );
  if (!data.success) throw new Error('Clinic not found');
  return data.data;
}

// --- Bookings (auth required) ---

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Booking {
  _id: string;
  clinicId: string;
  branchId: string | null;
  serviceId: string;
  doctorId: string | null;
  userId: string;
  scheduledAt: string;
  scheduledDate: string;
  scheduledTime: string;
  status: BookingStatus;
  price: number | null;
  cancel: { by: 'patient' | 'clinic' | null; reason: string | null; cancelledAt: string | null };
  createdAt: string;
  updatedAt: string;
  clinicDisplayName?: string;
  serviceTitle?: string;
  doctorName?: string | null;
  branchName?: string | null;
  durationMin?: number;
}

export async function createBooking(body: {
  clinicId: string;
  branchId?: string | null;
  serviceId: string;
  doctorId?: string | null;
  scheduledDate: string;
  scheduledTime: string;
}): Promise<Booking> {
  const { data } = await api.post<{ success: boolean; data: Booking }>('/bookings', body);
  if (!data.success) throw new Error('Booking failed');
  return data.data;
}

export async function getMyBookings(status?: BookingStatus): Promise<Booking[]> {
  const params = status ? { status } : {};
  const { data } = await api.get<{ success: boolean; data: Booking[] }>('/bookings/me', { params });
  if (!data.success) throw new Error('Failed to load bookings');
  return data.data;
}

export async function getBookingById(id: string): Promise<Booking> {
  const { data } = await api.get<{ success: boolean; data: Booking }>(`/bookings/${id}`);
  if (!data.success) throw new Error('Booking not found');
  return data.data;
}

export async function getNextUpcomingBooking(): Promise<Booking | null> {
  const { data } = await api.get<{ success: boolean; data: Booking | null }>('/bookings/next-upcoming');
  if (!data.success) throw new Error('Failed to load');
  return data.data;
}

export async function cancelBooking(bookingId: string, reason?: string | null): Promise<Booking> {
  const { data } = await api.patch<{ success: boolean; data: Booking }>(`/bookings/${bookingId}/cancel`, {
    reason: reason ?? null,
  });
  if (!data.success) throw new Error('Cancel failed');
  return data.data;
}
