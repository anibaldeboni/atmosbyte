import { resolveThemeFromWindow, type Theme } from "./themeResolver"
import { applyThemeToDocument } from "./themeDom"

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
    applyThemeToDocument(doc, theme)
    return theme
  } catch {
    applyThemeToDocument(doc, "light")
    return "light"
  }
}
