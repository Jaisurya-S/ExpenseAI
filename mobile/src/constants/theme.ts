/**
 * XpenseAI Theme Design System - Premium Light & Dark Modes
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#09090B', // zinc-950
    textSecondary: '#52525B', // zinc-600
    textMuted: '#71717A', // zinc-500
    background: '#FAFAFA', // zinc-50
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F4F4F5', // zinc-100
    card: '#FFFFFF',
    cardBorder: '#E4E4E7', // zinc-200
    cardElevated: '#FFFFFF',
    inputBg: '#FFFFFF',
    inputBorder: '#E4E4E7', // zinc-200
    primary: '#18181B', // zinc-900 - signature high-contrast shadcn primary
    primaryLight: '#F4F4F5',
    primaryText: '#FAFAFA',
    accent: '#09090B',
    accentPurple: '#7C3AED',
    accentYellow: '#D97706',
    danger: '#EF4444',
    dangerBg: '#FEF2F2',
    dangerBorder: '#FECACA',
    success: '#10B981',
    successBg: '#ECFDF5',
    tabBarBg: '#FFFFFF',
    tabBarBorder: '#E4E4E7',
    tabBarActive: '#09090B',
    tabBarInactive: '#A1A1AA',
    cardShadow: 'rgba(0, 0, 0, 0.03)',
  },
  dark: {
    text: '#FAFAFA', // zinc-50
    textSecondary: '#A1A1AA', // zinc-400
    textMuted: '#71717A', // zinc-500
    background: '#09090B', // zinc-950 - signature pure shadcn dark background
    backgroundElement: '#18181B', // zinc-900
    backgroundSelected: '#27272A', // zinc-800
    card: '#121215', // subtle elevated zinc card
    cardBorder: '#27272A', // zinc-800
    cardElevated: '#18181B',
    inputBg: '#121215',
    inputBorder: '#27272A',
    primary: '#FAFAFA', // zinc-50 - signature high-contrast shadcn primary in dark
    primaryLight: '#27272A',
    primaryText: '#09090B',
    accent: '#FAFAFA',
    accentPurple: '#A78BFA',
    accentYellow: '#FBBF24',
    danger: '#F87171',
    dangerBg: '#450A0A',
    dangerBorder: '#7F1D1D',
    success: '#34D399',
    successBg: '#064E3B',
    tabBarBg: '#09090B',
    tabBarBorder: '#27272A',
    tabBarActive: '#FAFAFA',
    tabBarInactive: '#71717A',
    cardShadow: 'rgba(0, 0, 0, 0.5)',
  },
} as const;

export type ThemeType = 'light' | 'dark';
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, serif',
    rounded: 'Inter, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
