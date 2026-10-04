import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ThemeCurtain } from "./ThemeCurtain";
import {
  applyTheme,
  getRevealRadius,
  persistTheme,
  resolveInitialTheme,
  type Theme,
  type ThemeOrigin,
} from "./theme";

interface ThemeContextValue {
  theme: Theme;
  targetTheme: Theme;
  transitioning: boolean;
  toggleTheme(origin: ThemeOrigin): void;
}

interface CurtainState {
  origin: ThemeOrigin;
  radius: number;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function currentStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function systemThemeQuery() {
  return window.matchMedia?.("(prefers-color-scheme: dark)") ?? { matches: false };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => resolveInitialTheme(currentStorage(), systemThemeQuery()));
  const [targetTheme, setTargetTheme] = useState<Theme>(theme);
  const [transitioning, setTransitioning] = useState(false);
  const [curtain, setCurtain] = useState<CurtainState | null>(null);
  const transitionRef = useRef(false);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const commitTheme = useCallback((nextTheme: Theme) => {
    applyTheme(nextTheme);
    setTheme(nextTheme);
    persistTheme(currentStorage(), nextTheme);
  }, []);

  const finishTransition = useCallback(() => {
    transitionRef.current = false;
    setCurtain(null);
    setTransitioning(false);
  }, []);

  const completeCurtain = useCallback(() => {
    if (curtain === null) return;
    commitTheme(curtain.theme);
    finishTransition();
  }, [commitTheme, curtain, finishTransition]);

  const toggleTheme = useCallback((origin: ThemeOrigin) => {
    if (transitionRef.current) return;
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setTargetTheme(nextTheme);

    if (reduceMotion) {
      commitTheme(nextTheme);
      return;
    }

    const radius = getRevealRadius(origin, { width: window.innerWidth, height: window.innerHeight });
    const root = document.documentElement;
    root.style.setProperty("--theme-origin-x", `${origin.x}px`);
    root.style.setProperty("--theme-origin-y", `${origin.y}px`);
    root.style.setProperty("--theme-reveal-radius", `${radius}px`);
    transitionRef.current = true;
    setTransitioning(true);

    if (typeof document.startViewTransition === "function") {
      try {
        const transition = document.startViewTransition(() => commitTheme(nextTheme));
        void transition.finished.finally(finishTransition);
        return;
      } catch {
        // Fall through to the CSS curtain when the native transition rejects synchronously.
      }
    }

    setCurtain({ origin, radius, theme: nextTheme });
  }, [commitTheme, finishTransition, theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    targetTheme,
    transitioning,
    toggleTheme,
  }), [targetTheme, theme, toggleTheme, transitioning]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {curtain && (
        <ThemeCurtain
          onComplete={completeCurtain}
          origin={curtain.origin}
          radius={curtain.radius}
          targetTheme={curtain.theme}
        />
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (value === null) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
