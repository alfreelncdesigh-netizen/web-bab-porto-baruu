import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCookie, setCookie } from '../lib/cookies';

type ThemeName = 'light' | 'dark' | 'tiffany' | 'charcoal' | 'cyprus';

interface ThemeContextType {
  theme: ThemeName;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const fromCookie = getCookie('app-theme') as ThemeName | null;
    if (fromCookie && ['light', 'dark', 'tiffany', 'charcoal', 'cyprus'].includes(fromCookie)) {
      return fromCookie;
    }
    const saved = localStorage.getItem('app-theme');
    return (saved as ThemeName) || 'light';
  });

  // Calculate isDark for backward compatibility in components
  const isDark = theme !== 'light';

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    setCookie('app-theme', theme, { days: 365 });
    const root = document.documentElement;
    
    // Always add dark class for dark, tiffany, charcoal, cyprus
    if (theme !== 'light') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Handle custom themes
    root.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const themes: ThemeName[] = ['light', 'dark', 'tiffany', 'charcoal', 'cyprus'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
