import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_SERVICES_KEY = '@shifo_saved_services';

/** Minimal service shape for saved list (display + navigate to detail) */
export interface SavedServiceItem {
  _id: string;
  title: string;
  serviceImage: string | null;
  categoryName: string;
  clinicId: string;
  clinicDisplayName: string;
  price: { amount?: number; minAmount?: number; maxAmount?: number; currency: string };
}

interface SavedServicesState {
  items: SavedServiceItem[];
  hydrated: boolean;
  addService: (service: SavedServiceItem) => Promise<void>;
  removeService: (serviceId: string) => Promise<void>;
  isSaved: (serviceId: string) => boolean;
  getSavedServices: () => SavedServiceItem[];
  hydrate: () => Promise<void>;
}

export const useSavedServicesStore = create<SavedServicesState>((set, get) => ({
  items: [],
  hydrated: false,

  addService: async (service) => {
    const { items } = get();
    if (items.some((s) => s._id === service._id)) return;
    const next = [...items, service];
    set({ items: next });
    await AsyncStorage.setItem(SAVED_SERVICES_KEY, JSON.stringify(next));
  },

  removeService: async (serviceId) => {
    const { items } = get();
    const next = items.filter((s) => s._id !== serviceId);
    set({ items: next });
    await AsyncStorage.setItem(SAVED_SERVICES_KEY, JSON.stringify(next));
  },

  isSaved: (serviceId) => get().items.some((s) => s._id === serviceId),

  getSavedServices: () => get().items,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVED_SERVICES_KEY);
      const items = raw ? JSON.parse(raw) : [];
      set({ items: Array.isArray(items) ? items : [], hydrated: true });
    } catch {
      set({ items: [], hydrated: true });
    }
  },
}));

/** Convert PublicServiceItem (or detail response) to SavedServiceItem */
export function toSavedServiceItem(service: {
  _id: string;
  title: string;
  serviceImage: string | null;
  categoryName: string;
  clinicId: string;
  clinicDisplayName: string;
  price: { amount?: number; minAmount?: number; maxAmount?: number; currency: string };
}): SavedServiceItem {
  return {
    _id: service._id,
    title: service.title,
    serviceImage: service.serviceImage ?? null,
    categoryName: service.categoryName ?? '',
    clinicId: service.clinicId,
    clinicDisplayName: service.clinicDisplayName,
    price: service.price,
  };
}
