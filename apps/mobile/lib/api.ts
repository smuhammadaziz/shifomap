import axios from 'axios';
import { Platform } from 'react-native';

// EXPO_PUBLIC_API_URL: set in .env (production: https://api.shifoyol.uz, dev: http://192.168.x.x:8080).
// Android emulator: 10.0.2.2 is the host machine. iOS Simulator: localhost works.
function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  // Fallback to production backend if .env is not set
  return 'https://api.shifoyol.uz';
  // return 'http://192.168.58.151:8080'
}
const API_BASE = getApiBase();

/** User-friendly message when request fails due to connection (device can't reach backend). */
export function getConnectionErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code;
  if (code === 'ERR_NETWORK' || msg.includes('Network Error') || msg.includes('ECONNREFUSED')) {
    return "Cannot reach server. Please check your internet connection and try again.";
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
  contacts: { email?: string | null; phone?: string; telegram?: string | null };
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

export async function deleteMe(): Promise<{ success: boolean }> {
  const { data } = await api.delete<{ success: boolean }>('/patients/me');
  if (!data.success) throw new Error('Failed to delete account');
  return data;
}

export async function changePatientPassword(oldPassword: string, newPassword: string): Promise<Patient> {
  const { data } = await api.post<{ success: boolean; data: Patient }>(
    '/patients/me/change-password',
    { oldPassword, newPassword }
  );
  if (!data.success) throw new Error('Failed to change password');
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
  rating?: { avg: number; count: number };
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

export interface UnifiedSearchResult {
  services: PublicServiceItem[];
  clinics: ClinicListItem[];
}

export async function searchServicesSuggest(q: string, limit = 15): Promise<UnifiedSearchResult> {
  const { data } = await api.get<{ success: boolean; data: UnifiedSearchResult }>(
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

// --- Clinic list (public) ---

export interface ClinicListItem {
  id: string;
  clinicDisplayName: string;
  logoUrl: string | null;
  coverUrl: string | null;
  servicesCount: number;
  branchesCount: number;
  categories: Array<{ _id: string; name: string } | string>;
  descriptionShort: string | null;
  rating: { avg: number; count: number };
  branches: Array<{ id: string; name: string; address: { city: string; street: string; geo: { lat: number; lng: number } } }>;
}

export async function getClinicsList(limit = 100): Promise<ClinicListItem[]> {
  const { data } = await api.get<{ success: boolean; data: ClinicListItem[] }>(
    '/clinics/public/clinics',
    { params: { limit } }
  );
  if (!data.success) throw new Error('Failed to load clinics');
  return data.data;
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

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'patient_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

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
  consultationPrice?: { amount?: number; minAmount?: number; maxAmount?: number; currency: string } | null;
  price: number | null;
  cancel: { by: 'patient' | 'clinic' | null; reason: string | null; cancelledAt: string | null };
  statusHistory?: Array<{ type: string; at: string; by: { role: string; id: string } | null }>;
  createdAt: string;
  updatedAt: string;
  clinicDisplayName?: string;
  serviceTitle?: string;
  doctorName?: string | null;
  branchName?: string | null;
  durationMin?: number;
}

// --- Prescriptions (auth required) ---

export type FoodRelation = 'before_food' | 'after_food' | 'no_relation';
export type PillStatus = 'pending' | 'taken' | 'skipped';

export interface PrescriptionMedicine {
  key: string;
  name: string;
  dosage: string;
  durationDays: number;
  timesPerDay: number;
  foodRelation: FoodRelation;
  foodTiming: string | null;
  notes: string | null;
  scheduleTimes: string[];
}

export interface PrescriptionCard {
  _id: string;
  bookingId: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  clinicName: string;
  prescriptionDate: string;
  medicinesCount: number;
}

export interface PrescriptionDetail {
  _id: string;
  bookingId: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  clinicName: string;
  prescriptionDate: string;
  medicines: PrescriptionMedicine[];
  schedule: { date: string; items: Array<{ medicineKey: string; time: string; name: string; dosage: string; foodRelation: FoodRelation; foodTiming: string | null; notes: string | null; status: PillStatus }> };
}

export async function getMyPrescriptions(): Promise<PrescriptionCard[]> {
  const { data } = await api.get<{ success: boolean; data: PrescriptionCard[] }>('/prescriptions/me');
  if (!data.success) throw new Error('Failed to load prescriptions');
  return data.data;
}

export async function getPrescriptionById(id: string, date?: string): Promise<PrescriptionDetail> {
  const { data } = await api.get<{ success: boolean; data: PrescriptionDetail }>(`/prescriptions/${id}`, {
    params: date ? { date } : {},
  });
  if (!data.success) throw new Error('Prescription not found');
  return data.data;
}

export async function setPrescriptionEvent(input: { prescriptionId: string; medicineKey: string; date: string; time: string; action: 'taken' | 'skipped' }) {
  const { data } = await api.post<{ success: boolean; data: any }>(`/prescriptions/${input.prescriptionId}/event`, {
    medicineKey: input.medicineKey,
    date: input.date,
    time: input.time,
    action: input.action,
  });
  if (!data.success) throw new Error('Failed to update');
  return data.data;
}

export async function getMyNextPill(): Promise<{ prescriptionId: string; time: string; medicineName: string } | null> {
  const { data } = await api.get<{ success: boolean; data: { prescriptionId: string; time: string; medicineName: string } | null }>(
    '/prescriptions/me/next'
  );
  if (!data.success) throw new Error('Failed to load');
  return data.data;
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

export async function getBookedSlots(clinicId: string, doctorId: string, date: string): Promise<string[]> {
  try {
    const { data } = await api.get<{ success: boolean; data: string[] }>('/bookings/booked-slots', {
      params: { clinicId, doctorId, date },
    });
    return data.success ? data.data : [];
  } catch {
    return [];
  }
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

// --- Reviews (GET public; POST requires auth) ---

export interface ReviewItem {
  _id: string;
  clinicId: string;
  serviceId: string | null;
  doctorId: string | null;
  patientId: string;
  patientName?: string;
  stars: number;
  text: string | null;
  createdAt: string;
}

export interface ReviewsResponse {
  reviews: ReviewItem[];
  total: number;
  rating: { avg: number; count: number };
}

export async function getReviews(params: {
  clinicId: string;
  serviceId?: string | null;
  doctorId?: string | null;
  skip?: number;
  limit?: number;
}): Promise<ReviewsResponse> {
  const { data } = await api.get<{ success: boolean; data: ReviewsResponse }>('/reviews', {
    params: {
      clinicId: params.clinicId,
      ...(params.serviceId != null && { serviceId: params.serviceId }),
      ...(params.doctorId != null && { doctorId: params.doctorId }),
      skip: params.skip ?? 0,
      limit: params.limit ?? 10,
    },
  });
  if (!data.success) throw new Error('Failed to load reviews');
  return data.data;
}

export async function submitReview(body: {
  clinicId: string;
  serviceId?: string | null;
  doctorId?: string | null;
  stars: number;
  text?: string | null;
}): Promise<ReviewItem> {
  const { data } = await api.post<{ success: boolean; data: ReviewItem }>('/reviews', body);
  if (!data.success) throw new Error('Failed to submit review');
  return data.data;
}

// --- Custom Reminders ---

export interface CustomReminder {
  id: string;
  pillName: string;
  time: string;
  notes: string | null;
  timesPerDay: number;
  isActive: boolean;
}

export async function getCustomReminders(): Promise<CustomReminder[]> {
  const { data } = await api.get<{ success: boolean; data: CustomReminder[] }>('/prescriptions/me/custom-reminders');
  if (!data.success) throw new Error('Failed to load custom reminders');
  return data.data;
}

export async function addCustomReminder(body: {
  pillName: string;
  time: string;
  notes?: string | null;
  timesPerDay: number;
}): Promise<CustomReminder> {
  const { data } = await api.post<{ success: boolean; data: CustomReminder }>('/prescriptions/me/custom-reminders', body);
  if (!data.success) throw new Error('Failed to add reminder');
  return data.data;
}

export async function deleteCustomReminder(id: string): Promise<boolean> {
  const { data } = await api.delete<{ success: boolean; data: { success: boolean } }>(`/prescriptions/me/custom-reminders/${id}`);
  return data.success;
}

// --- Files (upload + URL helper) ---

export function getFileUrl(id: string | null | undefined): string | null {
  if (!id) return null;
  if (id.startsWith('http')) return id;
  if (id.startsWith('/v1/')) return `${API_BASE}${id}`;
  return `${API_BASE}/v1/files/${id}`;
}

export async function uploadFile(uri: string, name?: string, type?: string): Promise<{ _id: string; url: string; originalName: string; mimeType: string; size: number; createdAt: string; }> {
  const form = new FormData();
  const mimeType = type ?? 'image/jpeg';
  const filename = name ?? `upload-${Date.now()}.${mimeType.split('/')[1] ?? 'jpg'}`;
  // @ts-expect-error React Native form-data accepts { uri, name, type }
  form.append('file', { uri, name: filename, type: mimeType });
  const { data } = await api.post<{ success: boolean; data: any }>('/files', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: (d) => d,
  });
  if (!data.success) throw new Error('Upload failed');
  return data.data;
}

// --- Medical history ---

export interface MedicalHistoryEntry {
  _id: string;
  patientId: string;
  name: string;
  description: string;
  durationDays: number;
  createdAt: string;
  updatedAt: string;
}

export async function listMedicalHistory(): Promise<MedicalHistoryEntry[]> {
  const { data } = await api.get<{ success: boolean; data: MedicalHistoryEntry[] }>('/patients/me/history');
  if (!data.success) throw new Error('Failed to load history');
  return data.data;
}

export async function addMedicalHistory(body: { name: string; description: string; durationDays: number }): Promise<MedicalHistoryEntry> {
  const { data } = await api.post<{ success: boolean; data: MedicalHistoryEntry }>('/patients/me/history', body);
  if (!data.success) throw new Error('Failed to add');
  return data.data;
}

export async function updateMedicalHistory(id: string, body: Partial<{ name: string; description: string; durationDays: number }>): Promise<MedicalHistoryEntry> {
  const { data } = await api.patch<{ success: boolean; data: MedicalHistoryEntry }>(`/patients/me/history/${id}`, body);
  if (!data.success) throw new Error('Failed to update');
  return data.data;
}

export async function deleteMedicalHistory(id: string): Promise<void> {
  const { data } = await api.delete<{ success: boolean }>(`/patients/me/history/${id}`);
  if (!data.success) throw new Error('Failed to delete');
}

// --- Assessments (8-question health test) ---

export interface AssessmentEntry {
  _id: string;
  patientId: string;
  answers: Array<{ question: string; answer: string }>;
  condition: string | null;
  advice: string | null;
  severity: 'low' | 'medium' | 'high' | null;
  aiSummary: string | null;
  createdAt: string;
}

export async function saveAssessment(body: {
  answers: Array<{ question: string; answer: string }>;
  condition?: string | null;
  advice?: string | null;
  severity?: 'low' | 'medium' | 'high' | null;
  aiSummary?: string | null;
}): Promise<AssessmentEntry> {
  const { data } = await api.post<{ success: boolean; data: AssessmentEntry }>('/assessments', body);
  if (!data.success) throw new Error('Failed to save');
  return data.data;
}

export async function listMyAssessments(): Promise<AssessmentEntry[]> {
  const { data } = await api.get<{ success: boolean; data: AssessmentEntry[] }>('/assessments/me');
  if (!data.success) throw new Error('Failed to load');
  return data.data;
}

// --- Chat ---

export interface ChatConversation {
  _id: string;
  patientId: string;
  doctorId: string;
  clinicId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
  patientName: string | null;
  patientAvatar: string | null;
  doctorName: string | null;
  doctorAvatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderRole: 'patient' | 'doctor';
  senderId: string;
  text: string;
  attachments: string[];
  readAt: string | null;
  createdAt: string;
}

export async function openConversationWithDoctor(clinicId: string, doctorId: string): Promise<ChatConversation> {
  const { data } = await api.post<{ success: boolean; data: ChatConversation }>('/chat/patient/open', { clinicId, doctorId });
  if (!data.success) throw new Error('Failed to open chat');
  return data.data;
}

export async function listPatientConversations(): Promise<ChatConversation[]> {
  const { data } = await api.get<{ success: boolean; data: ChatConversation[] }>('/chat/patient/conversations');
  if (!data.success) throw new Error('Failed to load');
  return data.data;
}

export async function listConversationMessages(id: string): Promise<{ conversation: ChatConversation; messages: ChatMessage[] }> {
  const { data } = await api.get<{ success: boolean; data: { conversation: ChatConversation; messages: ChatMessage[] } }>(
    `/chat/patient/conversations/${id}/messages`
  );
  if (!data.success) throw new Error('Failed to load');
  return data.data;
}

export async function sendChatMessage(id: string, text: string, attachments: string[] = []): Promise<ChatMessage> {
  const { data } = await api.post<{ success: boolean; data: ChatMessage }>(
    `/chat/patient/conversations/${id}/messages`,
    { text, attachments }
  );
  if (!data.success) throw new Error('Failed to send');
  return data.data;
}

// --- Posts (Instagram-style feed) ---

export interface FeedPost {
  _id: string;
  imageUrl: string;
  caption: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedResponse {
  items: FeedPost[];
  nextCursor: string | null;
}

export interface PostComment {
  _id: string;
  postId: string;
  patientId: string;
  patientName: string | null;
  patientAvatar: string | null;
  text: string;
  createdAt: string;
}

export async function listPosts(cursor?: string, limit = 15): Promise<FeedResponse> {
  const { data } = await api.get<{ success: boolean; data: FeedResponse }>('/posts', {
    params: { ...(cursor ? { cursor } : {}), limit },
  });
  if (!data.success) throw new Error('Failed to load feed');
  return data.data;
}

export async function getPostById(id: string): Promise<FeedPost> {
  const { data } = await api.get<{ success: boolean; data: FeedPost }>(`/posts/${id}`);
  if (!data.success) throw new Error('Not found');
  return data.data;
}

export async function togglePostLike(id: string, like: boolean): Promise<void> {
  if (like) {
    await api.post(`/posts/${id}/like`);
  } else {
    await api.delete(`/posts/${id}/like`);
  }
}

export async function listPostComments(id: string, limit = 30): Promise<PostComment[]> {
  const { data } = await api.get<{ success: boolean; data: PostComment[] }>(`/posts/${id}/comments`, {
    params: { limit },
  });
  if (!data.success) throw new Error('Failed to load');
  return data.data;
}

export async function addPostComment(id: string, text: string): Promise<PostComment> {
  const { data } = await api.post<{ success: boolean; data: PostComment }>(`/posts/${id}/comments`, { text });
  if (!data.success) throw new Error('Failed to comment');
  return data.data;
}

// --- Doctor-first booking ---

export interface DoctorSlotsResponse {
  schedule: {
    timezone: string;
    weekly: Array<{ day: number; from: string; to: string; lunchFrom?: string; lunchTo?: string }>;
  };
  bookedTimes: string[];
  services: Array<{
    _id: string;
    title: string;
    durationMin: number;
    price: { amount?: number; minAmount?: number; maxAmount?: number; currency: string };
    serviceImage: string | null;
  }>;
}

export async function getDoctorSlots(clinicId: string, doctorId: string, date: string): Promise<DoctorSlotsResponse> {
  const { data } = await api.get<{ success: boolean; data: DoctorSlotsResponse }>('/bookings/doctor-slots', {
    params: { clinicId, doctorId, date },
  });
  if (!data.success) throw new Error('Failed to load');
  return data.data;
}

// --- AI chat logging + feedback ---
export interface AiConversation {
  _id: string;
  patientId: string;
  patientName: string | null;
  patientPhone: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  feedbackStatus: 'none' | 'rated' | 'dismissed';
  feedbackRating: number | null;
  feedbackText: string | null;
  feedbackAt: string | null;
}

export interface AiConversationMessage {
  _id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

export async function createAiConversation(title: string): Promise<AiConversation> {
  const { data } = await api.post<{ success: boolean; data: AiConversation }>('/ai-chat/conversations', { title });
  if (!data.success) throw new Error('Failed to create conversation');
  return data.data;
}

export async function addAiConversationMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  text: string
): Promise<AiConversationMessage> {
  const { data } = await api.post<{ success: boolean; data: AiConversationMessage }>(
    `/ai-chat/conversations/${conversationId}/messages`,
    { role, text }
  );
  if (!data.success) throw new Error('Failed to add message');
  return data.data;
}

export async function submitAiConversationFeedback(
  conversationId: string,
  input: { rating?: number; feedbackText?: string; dismissed?: boolean }
): Promise<{ feedbackStatus: 'none' | 'rated' | 'dismissed' }> {
  const { data } = await api.post<{ success: boolean; data: { feedbackStatus: 'none' | 'rated' | 'dismissed' } }>(
    `/ai-chat/conversations/${conversationId}/feedback`,
    input
  );
  if (!data.success) throw new Error('Failed to submit feedback');
  return data.data;
}
