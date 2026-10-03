import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const emptySubscribe = () => () => {};

export function useColorScheme() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const colorScheme = useRNColorScheme();

  if (isClient) {
    return colorScheme;
  }

  return 'light';
}
