import { Colors, ThemeType } from '@/constants/theme';
import { useColorScheme as useNativeColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/useAuthStore';

export function useAppTheme() {
  const systemScheme = useNativeColorScheme();
  const { themeMode, setThemeMode } = useAuthStore();

  const resolvedTheme: ThemeType =
    themeMode === 'system'
      ? systemScheme === 'light'
        ? 'light'
        : 'dark'
      : themeMode;

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  return {
    theme: resolvedTheme,
    isDark,
    colors,
    themeMode,
    systemScheme: systemScheme || 'dark',
    setThemeMode,
  };
}

export function useTheme() {
  const { colors } = useAppTheme();
  return colors;
}
