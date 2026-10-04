export type Theme = "light" | "dark";

export type ThemeOrigin = { x: number; y: number };
export type ThemeViewport = { width: number; height: number };

export const THEME_STORAGE_KEY = "wuwa-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function resolveInitialTheme(
  storage: Pick<Storage, "getItem"> | null,
  colorScheme: Pick<MediaQueryList, "matches">,
): Theme {
  try {
    const saved = storage?.getItem(THEME_STORAGE_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    // Browser storage can be unavailable in privacy-restricted contexts.
  }
  return colorScheme.matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function persistTheme(storage: Pick<Storage, "setItem"> | null, theme: Theme) {
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The in-page theme remains usable even when persistence is unavailable.
  }
}

export function getRevealRadius(origin: ThemeOrigin, viewport: ThemeViewport) {
  return Math.max(
    Math.hypot(origin.x, origin.y),
    Math.hypot(viewport.width - origin.x, origin.y),
    Math.hypot(origin.x, viewport.height - origin.y),
    Math.hypot(viewport.width - origin.x, viewport.height - origin.y),
  );
}
