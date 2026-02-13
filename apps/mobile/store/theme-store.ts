import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@shifo_theme';

export type AppTheme = 'light' | 'dark';

interface ThemeState {
  theme: AppTheme;
  hydrated: boolean;
  setTheme: (theme: AppTheme) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light', // Default to light mode
  hydrated: false,

  setTheme: async (theme) => {
    set({ theme });
    await AsyncStorage.setItem(THEME_KEY, theme);
  },

  hydrate: async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      // If no saved theme, default to light
      set({ theme: (savedTheme as AppTheme) || 'light', hydrated: true });
    } catch {
      set({ theme: 'light', hydrated: true });
    }
  },
}));
