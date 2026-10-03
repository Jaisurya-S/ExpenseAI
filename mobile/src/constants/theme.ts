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
    backgroundSelected: '#EEF2F6',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    inputBg: '#F1F5F9',
    inputBorder: '#CBD5E1',
    primary: '#2563EB', // Modern Indigo/Royal Blue
    primaryLight: 'rgba(37, 99, 235, 0.08)',
    primaryText: '#FFFFFF',
    accent: '#0284C7',
    accentPurple: '#7C3AED',
    accentYellow: '#D97706',
    danger: '#EF4444',
    dangerBg: 'rgba(239, 68, 68, 0.08)',
    dangerBorder: 'rgba(239, 68, 68, 0.25)',
    success: '#10B981',
    tabBarBg: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarActive: '#2563EB',
    tabBarInactive: '#94A3B8',
    cardShadow: 'rgba(15, 23, 42, 0.06)',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    background: '#0B0F19', // Sophisticated Midnight Slate
    backgroundElement: '#131B2E',
    backgroundSelected: '#1E293B',
    card: '#111827',
    cardBorder: '#1F293D',
    inputBg: '#1A2338',
    inputBorder: '#27354F',
    primary: '#3B82F6', // Crisp Vibrant Blue
    primaryLight: 'rgba(59, 130, 246, 0.12)',
    primaryText: '#FFFFFF',
    accent: '#38BDF8',
    accentPurple: '#A78BFA',
    accentYellow: '#FBBF24',
    danger: '#F87171',
    dangerBg: 'rgba(248, 113, 113, 0.12)',
    dangerBorder: 'rgba(248, 113, 113, 0.25)',
    success: '#34D399',
    tabBarBg: '#0F1523',
    tabBarBorder: '#1A2234',
    tabBarActive: '#3B82F6',
    tabBarInactive: '#64748B',
    cardShadow: 'rgba(0, 0, 0, 0.35)',
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
