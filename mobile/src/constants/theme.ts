/**
 * XpenseAI Theme Design System - Premium Light & Dark Modes
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F1F5F9',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    cardElevated: '#FFFFFF',
    inputBg: '#F8FAFC',
    inputBorder: '#CBD5E1',
    primary: '#1D4ED8', // Executive Deep Royal Blue
    primaryLight: 'rgba(29, 78, 216, 0.08)',
    primaryText: '#FFFFFF',
    accent: '#0284C7',
    accentPurple: '#7C3AED',
    accentYellow: '#D97706',
    danger: '#DC2626',
    dangerBg: 'rgba(220, 38, 38, 0.08)',
    dangerBorder: 'rgba(220, 38, 38, 0.2)',
    success: '#059669',
    successBg: 'rgba(5, 150, 105, 0.08)',
    tabBarBg: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarActive: '#1D4ED8',
    tabBarInactive: '#94A3B8',
    cardShadow: 'rgba(15, 23, 42, 0.06)',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    background: '#090D16', // Deep Executive Midnight
    backgroundElement: '#111726',
    backgroundSelected: '#1A2338',
    card: '#0F1626',
    cardBorder: '#1E293B',
    cardElevated: '#141D30',
    inputBg: '#131C2E',
    inputBorder: '#23314D',
    primary: '#3B82F6', // Vibrant Precision Blue
    primaryLight: 'rgba(59, 130, 246, 0.12)',
    primaryText: '#FFFFFF',
    accent: '#38BDF8',
    accentPurple: '#A78BFA',
    accentYellow: '#FBBF24',
    danger: '#EF4444',
    dangerBg: 'rgba(239, 68, 68, 0.12)',
    dangerBorder: 'rgba(239, 68, 68, 0.25)',
    success: '#10B981',
    successBg: 'rgba(16, 185, 129, 0.12)',
    tabBarBg: '#0B101D',
    tabBarBorder: '#162035',
    tabBarActive: '#3B82F6',
    tabBarInactive: '#64748B',
    cardShadow: 'rgba(0, 0, 0, 0.4)',
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
