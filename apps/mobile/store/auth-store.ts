import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../lib/api';
import type { Patient } from '../lib/api';

const TOKEN_KEY = '@shifo_token';
const PATIENT_KEY = '@shifo_patient';
const LANGUAGE_KEY = '@shifo_language';

export type AppLanguage = 'uz' | 'ru' | 'en';

interface AuthState {
  token: string | null;
  patient: Patient | null;
  /** null = user has not chosen language yet */
  language: AppLanguage | null;
  /** Phone number set before navigating to password screen (cleared after use) */
  pendingPhone: string | null;
  hydrated: boolean;
  setToken: (token: string | null) => void;
  setPatient: (patient: Patient | null) => void;
  setPendingPhone: (phone: string | null) => void;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
  savePatient: (p: Patient) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  patient: null,
  language: null,
  pendingPhone: null,
  hydrated: false,

  setToken: (token) => {
    set({ token });
    setAuthToken(token);
    if (token) {
      AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      AsyncStorage.removeItem(TOKEN_KEY);
    }
  },

  setPatient: (patient) => {
    set({ patient });
    if (patient) {
      AsyncStorage.setItem(PATIENT_KEY, JSON.stringify(patient));
    } else {
      AsyncStorage.removeItem(PATIENT_KEY);
    }
  },

  setPendingPhone: (phone) => set({ pendingPhone: phone }),

  setLanguage: async (lang) => {
    set({ language: lang });
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  },

  savePatient: async (p) => {
    set({ patient: p });
    await AsyncStorage.setItem(PATIENT_KEY, JSON.stringify(p));
  },

  hydrate: async () => {
    try {
      const [token, patientJson, lang] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(PATIENT_KEY),
        AsyncStorage.getItem(LANGUAGE_KEY),
      ]);
      const patient = patientJson ? (JSON.parse(patientJson) as Patient) : null;
      const language = lang ? (lang as AppLanguage) : null;
      set({ token, patient, language, hydrated: true });
      setAuthToken(token);
    } catch {
      set({ hydrated: true });
    }
  },

  logout: async () => {
    set({ token: null, patient: null });
    setAuthToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, PATIENT_KEY]);
  },
}));

export function needsProfile(patient: Patient | null): boolean {
  if (!patient) return false;
  return !patient.fullName || patient.fullName.trim() === '';
}

export const DEFAULT_AVATAR = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdha5RhmdjYvDpP7l5CBkhK9fyBd25f9rJL7ZpVha-1uqZwhqATKoEJjXpmheN-pjVNYk&usqp=CAU';
