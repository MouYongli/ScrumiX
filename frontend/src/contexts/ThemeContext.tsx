'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  // Initialize with system preference to avoid flash
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default for SSR
  });

  // Load theme from localStorage on mount
  useEffect(() => {
    // Only access localStorage on client side
    if (typeof window === 'undefined') return;
    
    try {
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.profile?.theme) {
          setThemeState(settings.profile.theme);
          return; // If we have a saved theme, don't apply system theme
        }
      }
      
      // Only apply system theme if no saved theme exists
      const initialSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const root = document.documentElement;
      if (initialSystemTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } catch (error) {
      console.error('Failed to load theme from localStorage:', error);
    }
  }, []);

  // Calculate effective theme based on theme setting and system preference
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const updateEffectiveTheme = () => {
      let newEffectiveTheme: 'light' | 'dark';

      if (theme === 'light') {
        newEffectiveTheme = 'light';
      } else if (theme === 'dark') {
        newEffectiveTheme = 'dark';
      } else {
        // System theme
        newEffectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      setEffectiveTheme(newEffectiveTheme);

      // Apply theme to document
      const root = document.documentElement;
      if (newEffectiveTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    updateEffectiveTheme();

    // Listen for system theme changes when using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateEffectiveTheme();
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // Update localStorage (only on client side)
    if (typeof window !== 'undefined') {
      try {
        const savedSettings = localStorage.getItem('userSettings');
        const settings = savedSettings ? JSON.parse(savedSettings) : {};
        
        const updatedSettings = {
          ...settings,
          profile: {
            ...settings.profile,
            theme: newTheme,
          },
        };
        
        localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
      } catch (error) {
        console.error('Failed to save theme to localStorage:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 