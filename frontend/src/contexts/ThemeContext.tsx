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
  // Always initialize with 'system' for SSR consistency
  const [theme, setThemeState] = useState<Theme>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light'); // Default to light for SSR consistency
  const [mounted, setMounted] = useState(false);

  // Set mounted flag and load theme after hydration
  useEffect(() => {
    setMounted(true);
    
    // Load theme from localStorage after component mounts (client-side only)
    try {
      // First try to load from userSettings (preferred location)
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.profile?.theme && ['light', 'dark', 'system'].includes(settings.profile.theme)) {
          setThemeState(settings.profile.theme as Theme);
          return;
        }
      }
      
      // Fallback to direct theme storage
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme as Theme);
      }
    } catch (error) {
      console.error('Failed to load theme from localStorage:', error);
    }
  }, []);

  // Calculate effective theme based on theme setting and system preference
  useEffect(() => {
    // Only run on client side after mount
    if (!mounted) return;
    
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
        // Save to userSettings (preferred location)
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
        
        // Also save to direct theme storage for fallback compatibility
        localStorage.setItem('theme', newTheme);
      } catch (error) {
        console.error('Failed to save theme to localStorage:', error);
      }
    }
  };

  // Prevent hydration mismatch by ensuring consistent rendering
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: 'system', setTheme, effectiveTheme: 'light' }}>
        {children}
      </ThemeContext.Provider>
    );
  }

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