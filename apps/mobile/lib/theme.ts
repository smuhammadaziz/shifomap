import { AppTheme } from '../store/theme-store';

export const lightColors = {
  background: '#ffffff',
  backgroundSecondary: '#f8f9fa',
  backgroundCard: '#ffffff',
  backgroundInput: '#f1f3f5',
  backgroundInputFocused: '#ffffff',
  
  text: '#18181b',
  textSecondary: '#52525b',
  textTertiary: '#71717a',
  textPlaceholder: '#a1a1aa',
  
  border: '#e4e4e7',
  borderLight: '#f4f4f5',
  borderFocus: '#14228e',
  
  primary: '#14228e',
  primaryLight: '#4a5fd4',
  primaryBg: 'rgba(20, 34, 142, 0.1)',
  primaryBgActive: 'rgba(20, 34, 142, 0.15)',
  
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.1)',
  
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  
  info: '#3b82f6',
  infoBg: 'rgba(59, 130, 246, 0.1)',
  
  cardShadow: 'rgba(0, 0, 0, 0.05)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  iconPurple: '#4a5fd4',
  iconPurpleBg: 'rgba(20, 34, 142, 0.1)',
  
  iconGreen: '#22c55e',
  iconGreenBg: 'rgba(34, 197, 94, 0.1)',
  
  iconGray: '#71717a',
  iconGrayBg: 'rgba(113, 113, 122, 0.1)',
  
  switchTrackFalse: '#d1d5db',
  switchTrackTrue: '#14228e',
  switchThumb: '#ffffff',
  
  badge: '#e8eaf6',
  badgeText: '#14228e',
  
  onlineIndicator: '#22c55e',
};

export const darkColors = {
  background: '#09090b',
  backgroundSecondary: '#18181b',
  backgroundCard: '#18181b',
  backgroundInput: '#18181b',
  backgroundInputFocused: '#18181b',
  
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  textTertiary: '#71717a',
  textPlaceholder: '#71717a',
  
  border: '#27272a',
  borderLight: '#27272a',
  borderFocus: '#14228e',
  
  primary: '#14228e',
  primaryLight: '#4a5fd4',
  primaryBg: 'rgba(20, 34, 142, 0.1)',
  primaryBgActive: 'rgba(20, 34, 142, 0.15)',
  
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.1)',
  
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',
  
  info: '#3b82f6',
  infoBg: 'rgba(59, 130, 246, 0.1)',
  
  cardShadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  iconPurple: '#4a5fd4',
  iconPurpleBg: 'rgba(20, 34, 142, 0.1)',
  
  iconGreen: '#22c55e',
  iconGreenBg: 'rgba(34, 197, 94, 0.1)',
  
  iconGray: '#a1a1aa',
  iconGrayBg: 'rgba(113, 113, 122, 0.1)',
  
  switchTrackFalse: '#3f3f46',
  switchTrackTrue: '#14228e',
  switchThumb: '#ffffff',
  
  badge: 'rgba(20, 34, 142, 0.25)',
  badgeText: '#4a5fd4',
  
  onlineIndicator: '#22c55e',
};

export function getColors(theme: AppTheme) {
  return theme === 'light' ? lightColors : darkColors;
}

export type ThemeColors = typeof lightColors;
