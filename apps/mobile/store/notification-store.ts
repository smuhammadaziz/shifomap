import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_KEY = '@shifo_notifications';

export type NotificationType = 'reminder' | 'clinic' | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: number; // timestamp
  isRead: boolean;
  icon: string;
  iconLib: 'Ionicons' | 'MaterialCommunityIcons';
  iconColor: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  hydrated: boolean;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'time' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  hydrate: () => Promise<void>;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  hydrated: false,

  addNotification: (n) => {
    const newNotification: NotificationItem = {
      ...n,
      id: Math.random().toString(36).substring(7),
      time: Date.now(),
      isRead: false,
    };
    const updated = [newNotification, ...get().notifications];
    set({ notifications: updated });
    AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  },

  markAsRead: (id) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    set({ notifications: updated });
    AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  },

  markAllAsRead: () => {
    const updated = get().notifications.map((n) => ({ ...n, isRead: true }));
    set({ notifications: updated });
    AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  },

  removeNotification: (id) => {
    const updated = get().notifications.filter((n) => n.id !== id);
    set({ notifications: updated });
    AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  },

  clearAll: () => {
    set({ notifications: [] });
    AsyncStorage.removeItem(NOTIFICATIONS_KEY);
  },

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.isRead).length;
  },

  hydrate: async () => {
    try {
      const data = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (data) {
        set({ notifications: JSON.parse(data), hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));
