import { AppTheme } from '../store/theme-store';
import { getColors, type ThemeColors } from './theme';

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  round: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#0f1a4a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f1a4a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  lg: {
    shadowColor: '#0f1a4a',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 12,
  },
} as const;

export const type = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.6, lineHeight: 38 },
  titleXl: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.4, lineHeight: 30 },
  titleLg: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2, lineHeight: 26 },
  title: { fontSize: 17, fontWeight: '700' as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '500' as const, lineHeight: 20 },
  bodySm: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.2, lineHeight: 16 },
  overline: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const, lineHeight: 14 },
} as const;

/** Canonical logo blue — primary CTAs and active states */
export const brandPrimary = '#0A2FB8' as const;
export const brandPrimarySoft = '#E0E7FF' as const;

/**
 * Brand palette — accent colors used in gradients, chips, and decorative
 * surfaces. `iris`/`indigo*` alias primary blue for backward compatibility.
 * `lilac`/`lilacSoft` stay as soft blue-tint neutrals (not violet).
 */
export const brand = {
  primary: brandPrimary,
  primarySoft: brandPrimarySoft,
  indigo: '#1E40AF',
  indigoDeep: '#0A2FB8',
  iris: brandPrimary,
  lilac: '#93C5FD',
  lilacSoft: '#BFDBFE',
  sky: '#38bdf8',
  skySoft: '#bae6fd',
  mint: '#34d399',
  amber: '#f59e0b',
  rose: '#fb7185',
  peach: '#fda4af',
  cream: '#fef3c7',
  ink: '#0f172a',
} as const;

/**
 * Gradient pairs consumed by `PrimaryGradient`. Keep them subtle and
 * consistent so cards/heroes feel from the same family. Light-mode pairs
 * use pastel tints, dark-mode pairs use deep navy/charcoal tints so light
 * pastel surfaces don't punch through the dark theme.
 */
const lightGradients = {
  hero: ['#0A2FB8', '#1E40AF', '#3B82F6'] as string[],
  soft: ['#EEF2FF', '#E0E7FF'] as string[],
  cool: ['#e0e7ff', '#dbeafe'] as string[],
  warm: ['#fef3c7', '#fde68a'] as string[],
  mint: ['#d1fae5', '#a7f3d0'] as string[],
  rose: ['#fce7f3', '#fbcfe8'] as string[],
  night: ['#0f172a', '#1e1b4b'] as string[],
} as const;

const darkGradients = {
  // Vibrant CTAs stay vibrant in dark mode — these are foreground surfaces.
  hero: ['#0A2FB8', '#1E40AF', '#3B82F6'] as string[],
  // Background-style gradients are flipped to deep charcoal/navy so they
  // blend into the dark UI instead of looking like a bright "pastel island".
  soft: ['#101225', '#0d1126'] as string[],
  cool: ['#11142a', '#0e1024'] as string[],
  warm: ['#2a1f10', '#1a1207'] as string[],
  mint: ['#0c2620', '#06231a'] as string[],
  rose: ['#2a1019', '#1a0810'] as string[],
  night: ['#0f172a', '#1e1b4b'] as string[],
} as const;

export type GradientSet = typeof lightGradients;

export function getGradients(theme: AppTheme): GradientSet {
  return theme === 'dark' ? darkGradients : lightGradients;
}

/** @deprecated Prefer `tokens.gradients` from `getTokens(theme)`. */
export const gradients = lightGradients;

export interface Tokens {
  colors: ThemeColors;
  radii: typeof radii;
  spacing: typeof spacing;
  shadows: typeof shadows;
  type: typeof type;
  brand: typeof brand;
  gradients: GradientSet;
}

export function getTokens(theme: AppTheme): Tokens {
  return {
    colors: getColors(theme),
    radii,
    spacing,
    shadows,
    type,
    brand,
    gradients: getGradients(theme),
  };
}
