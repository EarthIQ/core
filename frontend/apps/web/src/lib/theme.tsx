import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeMode = "dark" | "light" | "system";
export type ActiveTheme = "dark" | "light";

interface ThemeContextType {
  theme: ThemeMode;
  activeTheme: ActiveTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "earthiq-theme-mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light" || saved === "system") {
      return saved as ThemeMode;
    }
    return "dark"; // Default to dark geospatial theme
  });

  const [activeTheme, setActiveTheme] = useState<ActiveTheme>("dark");

  useEffect(() => {
    const root = document.documentElement;

    function applyTheme(mode: ActiveTheme) {
      setActiveTheme(mode);
      root.classList.remove("light", "dark");
      root.classList.add(mode);
      root.setAttribute("data-theme", mode);
    }

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches ? "dark" : "light");

      const listener = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    } else {
      applyTheme(theme);
      return undefined;
    }
  }, [theme]);

  function setTheme(newTheme: ThemeMode) {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }

  function toggleTheme() {
    const next = activeTheme === "dark" ? "light" : "dark";
    setTheme(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, activeTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
