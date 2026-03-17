import { resolveBootstrapTheme } from "./bootstrapTheme"
import { resolveThemeFromWindow } from "./themeResolver"

type WindowMockOptions = {
  storedTheme?: string | null
  prefersDark?: boolean
  throwStorageRead?: boolean
  throwMatchMedia?: boolean
  withoutMatchMedia?: boolean
}

function createWindowMock(options: WindowMockOptions = {}): Window {
  const {
    storedTheme = null,
    prefersDark = false,
    throwStorageRead = false,
    throwMatchMedia = false,
    withoutMatchMedia = false,
  } = options

  const mock = {
    localStorage: {
      getItem: () => {
        if (throwStorageRead) {
          throw new Error("localStorage unavailable")
        }

        return storedTheme
      },
    },
    matchMedia: withoutMatchMedia
      ? undefined
      : () => {
          if (throwMatchMedia) {
            throw new Error("matchMedia unavailable")
          }

          return { matches: prefersDark }
        },
  }

  return mock as unknown as Window
}

test("theme resolver prioritizes valid persisted theme", () => {
  const win = createWindowMock({ storedTheme: "dark", prefersDark: false })

  expect(resolveThemeFromWindow(win)).toBe("dark")
})

test("theme resolver falls back to system preference when persisted theme is invalid", () => {
  const win = createWindowMock({ storedTheme: "invalid", prefersDark: true })

  expect(resolveThemeFromWindow(win)).toBe("dark")
})

test("theme resolver falls back to light when matchMedia is unavailable", () => {
  const win = createWindowMock({ withoutMatchMedia: true })

  expect(resolveThemeFromWindow(win)).toBe("light")
})

test("theme resolver gracefully ignores localStorage read errors", () => {
  const win = createWindowMock({ throwStorageRead: true, prefersDark: true })

  expect(resolveThemeFromWindow(win)).toBe("dark")
})

test("bootstrap and provider resolvers stay in parity", () => {
  const cases: WindowMockOptions[] = [
    { storedTheme: "light", prefersDark: true },
    { storedTheme: "dark", prefersDark: false },
    { storedTheme: null, prefersDark: true },
    { storedTheme: "invalid", prefersDark: false },
    { throwStorageRead: true, prefersDark: true },
    { withoutMatchMedia: true },
    { throwMatchMedia: true },
  ]

  for (const item of cases) {
    const win = createWindowMock(item)
    expect(resolveBootstrapTheme(win)).toBe(resolveThemeFromWindow(win))
  }
})
