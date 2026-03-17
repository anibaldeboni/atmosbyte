import { resolveThemeFromWindow, type Theme } from "./themeResolver"

export function resolveBootstrapTheme(win: Window): Theme {
  return resolveThemeFromWindow(win)
}

export function applyInitialTheme(doc: Document = document): Theme {
  try {
    const win = doc.defaultView
    if (!win) {
      throw new Error("Window unavailable")
    }

    const theme = resolveBootstrapTheme(win)
    doc.documentElement.dataset.theme = theme
    return theme
  } catch {
    doc.documentElement.dataset.theme = "light"
    return "light"
  }
}
