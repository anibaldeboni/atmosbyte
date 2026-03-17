export const THEME_STORAGE_KEY = "atmosbyte-theme"

export const THEMES = ["light", "dark"] as const

export type Theme = (typeof THEMES)[number]

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (value === "light" || value === "dark")
}

export function resolveTheme(storedTheme: unknown, prefersDark: boolean): Theme {
  if (isTheme(storedTheme)) {
    return storedTheme
  }

  return prefersDark ? "dark" : "light"
}

export function readStoredTheme(win: Window): Theme | undefined {
  try {
    const storedTheme = win.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(storedTheme) ? storedTheme : undefined
  } catch {
    return undefined
  }
}

export function readSystemPreference(win: Window): boolean {
  try {
    return typeof win.matchMedia === "function" && win.matchMedia("(prefers-color-scheme: dark)").matches
  } catch {
    return false
  }
}

export function resolveThemeFromWindow(win: Window): Theme {
  return resolveTheme(readStoredTheme(win), readSystemPreference(win))
}
