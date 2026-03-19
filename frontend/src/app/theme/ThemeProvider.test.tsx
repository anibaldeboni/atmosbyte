import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ThemeProvider, useTheme } from "./ThemeProvider"
import { THEME_STORAGE_KEY } from "./themeResolver"

function ThemeProbe(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme()

  return (
    <button type="button" onClick={toggleTheme} data-testid="theme-toggle" aria-label={theme}>
      {theme}
    </button>
  )
}

function setMatchMedia(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.dataset.theme = ""
  document.documentElement.style.colorScheme = ""
  document.head.innerHTML = '<meta name="theme-color" content="#166534" />'
  setMatchMedia(false)
})

test("theme provider initializes from existing document dataset", () => {
  document.documentElement.dataset.theme = "dark"
  window.localStorage.setItem(THEME_STORAGE_KEY, "light")

  render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  )

  expect(screen.getByTestId("theme-toggle")).toHaveTextContent("dark")
})

test("theme provider falls back to system preference when persisted value is absent", () => {
  setMatchMedia(true)

  render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  )

  expect(screen.getByTestId("theme-toggle")).toHaveTextContent("dark")
})

test("theme toggle updates html dataset and localStorage", async () => {
  const user = userEvent.setup()
  const setItemSpy = jest.spyOn(Storage.prototype, "setItem")

  render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  )

  await user.click(screen.getByTestId("theme-toggle"))

  expect(document.documentElement.dataset.theme).toBe("dark")
  expect(document.documentElement.style.colorScheme).toBe("dark")
  expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#171f31")
  expect(setItemSpy).toHaveBeenCalledWith(THEME_STORAGE_KEY, "dark")
})

test("theme toggle still updates html dataset when localStorage.setItem throws", async () => {
  const user = userEvent.setup()
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {
    // The test intentionally simulates localStorage failures.
  })
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked")
  })

  render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  )

  await user.click(screen.getByTestId("theme-toggle"))

  expect(document.documentElement.dataset.theme).toBe("dark")
  expect(warnSpy).toHaveBeenCalled()

  warnSpy.mockRestore()
})
