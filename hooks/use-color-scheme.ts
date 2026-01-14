import { useTheme } from '@/components/theme-context';

export function useColorScheme(): 'light' | 'dark' {
  const { effectiveColorScheme } = useTheme();
  return effectiveColorScheme;
}
