import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCookie, setCookie } from '../lib/cookies';

type ThemeName = 'light' | 'dark';

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
    if (fromCookie && (fromCookie === 'light' || fromCookie === 'dark')) {
      return fromCookie;
    }
    const saved = localStorage.getItem('app-theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return 'light';
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    setCookie('app-theme', theme, { days: 365 });
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
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
