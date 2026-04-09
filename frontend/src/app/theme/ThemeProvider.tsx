import { applyThemeToDocument } from "@/app/theme/themeDom"
import { resolveThemeFromWindow, THEME_STORAGE_KEY, type Theme, isTheme } from "@/app/theme/themeResolver"
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react"


type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getInitialTheme(doc: Document): Theme {
  const existingTheme = doc.documentElement.dataset.theme

  if (isTheme(existingTheme)) {
    return existingTheme
  }

  return resolveThemeFromWindow(window)
}

export function ThemeProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme(document))

  useEffect(() => {
    applyThemeToDocument(document, theme)
  }, [theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => {
        setTheme((current) => {
          const nextTheme: Theme = current === "light" ? "dark" : "light"

          try {
            window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
          } catch (error: unknown) {
            console.warn("Unable to persist theme preference", error)
          }

          return nextTheme
        })
      },
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }

  return context
}
