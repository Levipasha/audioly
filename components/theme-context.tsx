import React, { createContext, useContext, type ReactNode } from 'react';

export type ColorMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  effectiveColorScheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'audioly_color_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always use dark mode - no system detection or user preference needed
  const colorMode: ColorMode = 'dark';

  const setColorMode = async (mode: ColorMode) => {
    // No-op: color mode is locked to dark
  };

  // Always dark mode
  const effectiveColorScheme: 'light' | 'dark' = 'dark';

  // Always provide context value, even during loading (use default values)
  const contextValue: ThemeContextType = {
    colorMode,
    setColorMode,
    effectiveColorScheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
