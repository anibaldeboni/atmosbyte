# Frontend Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement phase-1 dark/light theming in `frontend` with a persistent icon-only toggle in `AppShell`, following system preference on first load.

**Architecture:** Introduce a small theme domain under `src/app/theme` with pure resolver utilities, an early bootstrap module that sets `html[data-theme]` before app mount, and a `ThemeProvider` context used by `AppShell`. Migrate shell/navigation colors to CSS variables in `styles.css` keyed by `[data-theme="dark"]`. Validate behavior with targeted Jest tests plus existing router regression coverage.

**Tech Stack:** React 19, TypeScript, React Context, Vite entry modules, Tailwind utilities + CSS variables, Jest + React Testing Library.

---

## File Structure

- Create: `frontend/src/app/theme/themeResolver.ts`
  - Responsibility: single source of truth for `Theme`, storage key, value validation, fallback precedence, and DOM application helper.
- Create: `frontend/src/app/theme/themeBootstrap.ts`
  - Responsibility: pre-mount initialization that sets `html[data-theme]` safely.
- Create: `frontend/src/app/theme/themeBootstrap.test.ts`
  - Responsibility: bootstrap safety tests including storage/media failures.
- Create: `frontend/src/app/theme/ThemeProvider.tsx`
  - Responsibility: React state/context for `theme` and `toggleTheme` with best-effort persistence.
- Create: `frontend/src/app/theme/themeResolver.test.ts`
  - Responsibility: unit tests for resolver precedence and failure behavior.
- Create: `frontend/src/app/theme/ThemeProvider.test.tsx`
  - Responsibility: integration tests for provider + context behavior (`aria`, dataset, persistence failures).
- Modify: `frontend/index.html`
  - Responsibility: load `themeBootstrap.ts` before `main.tsx`.
- Modify: `frontend/src/app/AppProviders.tsx`
  - Responsibility: wrap app with `ThemeProvider`.
- Modify: `frontend/src/shared/ui/AppShell.tsx`
  - Responsibility: render icon-only toggle before first nav link and use theme-aware classes.
- Modify: `frontend/src/styles.css`
  - Responsibility: define light baseline tokens in `:root` and dark overrides under `[data-theme="dark"]` for phase-1 shell/nav surfaces.
- Modify: `frontend/src/app/router.test.tsx`
  - Responsibility: keep route regression checks and add toggle placement/interaction assertions.

## Chunk 1: Theme foundation (resolver + bootstrap)

### Task 1: Build resolver contract with failing-first tests

**Files:**
- Create: `frontend/src/app/theme/themeResolver.test.ts`
- Create: `frontend/src/app/theme/themeResolver.ts`

- [ ] **Step 1: Write failing tests for resolver precedence and validation**

```ts
import {
  THEME_STORAGE_KEY,
  getSystemTheme,
  getValidatedTheme,
  resolveTheme,
  setDocumentTheme,
  type Theme,
} from "./themeResolver"

function mockMatchMedia(matchesDark: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? matchesDark : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

test("uses valid stored theme first", () => {
  const out = resolveTheme("dark")
  expect(out).toBe<Theme>("dark")
})

test("falls back to system preference when storage is invalid", () => {
  mockMatchMedia(true)
  expect(resolveTheme("banana")).toBe<Theme>("dark")
})

test("falls back to light when matchMedia is unavailable", () => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: undefined })
  expect(getSystemTheme()).toBe<Theme>("light")
})

test("validates theme strings", () => {
  expect(getValidatedTheme("light")).toBe<Theme>("light")
  expect(getValidatedTheme("dark")).toBe<Theme>("dark")
  expect(getValidatedTheme("other")).toBeNull()
})

test("sets html data-theme attribute", () => {
  setDocumentTheme("dark")
  expect(document.documentElement.dataset.theme).toBe("dark")
})

test("exports fixed storage key", () => {
  expect(THEME_STORAGE_KEY).toBe("atmosbyte-theme")
})
```

- [ ] **Step 2: Run tests to verify initial failure**

Run: `npm --prefix frontend run test -- themeResolver.test.ts`
Expected: FAIL with module/function-not-found errors.

- [ ] **Step 3: Implement minimal resolver utilities**

```ts
export type Theme = "light" | "dark"

export const THEME_STORAGE_KEY = "atmosbyte-theme"

export function getValidatedTheme(value: unknown): Theme | null {
  return value === "light" || value === "dark" ? value : null
}

export function getSystemTheme(): Theme {
  try {
    if (typeof window.matchMedia !== "function") return "light"
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  } catch {
    return "light"
  }
}

export function resolveTheme(stored: unknown): Theme {
  return getValidatedTheme(stored) ?? getSystemTheme()
}

export function readStoredTheme(): Theme | null {
  try {
    return getValidatedTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

export function writeStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // best effort persistence
  }
}

export function setDocumentTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm --prefix frontend run test -- themeResolver.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit resolver and tests**

```bash
git add frontend/src/app/theme/themeResolver.ts frontend/src/app/theme/themeResolver.test.ts
git commit -m "feat: add theme resolver utilities and tests"
```

### Task 2: Wire bootstrap before app mount

**Files:**
- Create: `frontend/src/app/theme/themeBootstrap.ts`
- Create: `frontend/src/app/theme/themeBootstrap.test.ts`
- Modify: `frontend/index.html`

- [ ] **Step 1: Write failing test for bootstrap side effect**

```ts
// frontend/src/app/theme/themeBootstrap.test.ts
import { runThemeBootstrap } from "./themeBootstrap"

test("bootstrap sets html data-theme safely", () => {
  document.documentElement.dataset.theme = ""
  runThemeBootstrap()
  expect(["light", "dark"]).toContain(document.documentElement.dataset.theme)
})

test("bootstrap falls back to light when storage and matchMedia throw", () => {
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked")
  })

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn(() => {
      throw new Error("unsupported")
    }),
  })

  expect(() => runThemeBootstrap()).not.toThrow()
  expect(document.documentElement.dataset.theme).toBe("light")
})

test("bootstrap output matches resolver output for same inputs", () => {
  jest.spyOn(Storage.prototype, "getItem").mockReturnValue("dark")
  runThemeBootstrap()
  expect(document.documentElement.dataset.theme).toBe("dark")
})
```

- [ ] **Step 2: Run tests to verify failure before bootstrap implementation**

Run: `npm --prefix frontend run test -- themeBootstrap.test.ts`
Expected: FAIL with missing `themeBootstrap` module/export.

- [ ] **Step 3: Implement bootstrap module and register it in `index.html`**

```ts
// frontend/src/app/theme/themeBootstrap.ts
import { readStoredTheme, resolveTheme, setDocumentTheme } from "./themeResolver"

export function runThemeBootstrap(): void {
  const resolved = resolveTheme(readStoredTheme())
  setDocumentTheme(resolved)
}

runThemeBootstrap()
```

```html
<!-- frontend/index.html -->
<script type="module" src="/src/app/theme/themeBootstrap.ts"></script>
<script type="module" src="/src/main.tsx"></script>
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm --prefix frontend run test -- themeResolver.test.ts themeBootstrap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit bootstrap integration**

```bash
git add frontend/index.html frontend/src/app/theme/themeBootstrap.ts frontend/src/app/theme/themeBootstrap.test.ts frontend/src/app/theme/themeResolver.test.ts
git commit -m "feat: initialize theme before app mount"
```

## Chunk 2: Provider, AppShell toggle, styles, and regressions

### Task 3: Add ThemeProvider and context tests

**Files:**
- Create: `frontend/src/app/theme/ThemeProvider.tsx`
- Create: `frontend/src/app/theme/ThemeProvider.test.tsx`
- Modify: `frontend/src/app/AppProviders.tsx`

- [ ] **Step 1: Write failing tests for provider initialization and toggle**

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeProvider, useTheme } from "./ThemeProvider"

function Probe(): JSX.Element {
  const { theme, toggleTheme } = useTheme()
  return (
    <>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </>
  )
}

test("provider initializes from html dataset", () => {
  document.documentElement.dataset.theme = "dark"
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )
  expect(screen.getByTestId("theme-value")).toHaveTextContent("dark")
})

test("provider falls back to resolver when dataset is missing", () => {
  document.documentElement.dataset.theme = ""
  jest.spyOn(Storage.prototype, "getItem").mockReturnValue("light")

  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )

  expect(screen.getByTestId("theme-value")).toHaveTextContent("light")
})

test("provider initial theme matches resolver output matrix", () => {
  const cases = [
    { stored: "dark", expected: "dark" },
    { stored: "light", expected: "light" },
    { stored: "invalid", expected: "light" },
  ] as const

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: false,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  for (const item of cases) {
    document.documentElement.dataset.theme = ""
    jest.spyOn(Storage.prototype, "getItem").mockReturnValue(item.stored)
    const { unmount } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId("theme-value")).toHaveTextContent(item.expected)
    unmount()
  }
})

test("toggle updates dataset and persists best-effort", async () => {
  const user = userEvent.setup()
  const setItemSpy = jest.spyOn(Storage.prototype, "setItem")

  document.documentElement.dataset.theme = "light"
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )

  await user.click(screen.getByRole("button", { name: "toggle" }))
  expect(document.documentElement.dataset.theme).toBe("dark")
  expect(setItemSpy).toHaveBeenCalled()
})

test("toggle still updates dataset when storage write throws", async () => {
  const user = userEvent.setup()
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked")
  })

  document.documentElement.dataset.theme = "light"
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )

  await user.click(screen.getByRole("button", { name: "toggle" }))
  expect(document.documentElement.dataset.theme).toBe("dark")
})
```

- [ ] **Step 2: Run tests and confirm failure first**

Run: `npm --prefix frontend run test -- ThemeProvider.test.tsx`
Expected: FAIL with missing provider/hook.

- [ ] **Step 3: Implement provider and wire in AppProviders**

```tsx
// frontend/src/app/theme/ThemeProvider.tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react"
import { readStoredTheme, resolveTheme, setDocumentTheme, writeStoredTheme, type Theme } from "./themeResolver"

type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialTheme(): Theme {
  const fromDataset = document.documentElement.dataset.theme
  if (fromDataset === "light" || fromDataset === "dark") return fromDataset
  return resolveTheme(readStoredTheme())
}

export function ThemeProvider({ children }: PropsWithChildren): JSX.Element {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())

  useEffect(() => {
    setDocumentTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "light" ? "dark" : "light"
      writeStoredTheme(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error("useTheme must be used within ThemeProvider")
  return value
}
```

```tsx
// frontend/src/app/AppProviders.tsx
import type { PropsWithChildren } from "react"
import { ThemeProvider } from "./theme/ThemeProvider"

export function AppProviders({ children }: PropsWithChildren): JSX.Element {
  return <ThemeProvider>{children}</ThemeProvider>
}
```

- [ ] **Step 4: Run tests to verify provider pass**

Run: `npm --prefix frontend run test -- ThemeProvider.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit provider integration**

```bash
git add frontend/src/app/AppProviders.tsx frontend/src/app/theme/ThemeProvider.tsx frontend/src/app/theme/ThemeProvider.test.tsx
git commit -m "feat: add theme provider and toggle context"
```

### Task 4: Add icon toggle in AppShell and migrate shell/nav tokens

**Files:**
- Modify: `frontend/src/shared/ui/AppShell.tsx`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/app/router.test.tsx`

- [ ] **Step 1: Extend router tests with failing toggle assertions**

```tsx
test("app shell renders theme toggle before first nav link", async () => {
  renderRoute("/")

  const nav = await screen.findByRole("navigation", { name: "Primary" })
  const toggle = screen.getByRole("button", { name: "Ativar modo escuro" })
  const firstLink = screen.getByRole("link", { name: "Início" })

  expect(nav.firstElementChild).toBe(toggle)
  expect(toggle.compareDocumentPosition(firstLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

test("toggle updates aria and html data-theme", async () => {
  renderRoute("/")
  const user = userEvent.setup()
  const toggle = await screen.findByRole("button", { name: "Ativar modo escuro" })

  await user.click(toggle)

  expect(document.documentElement.dataset.theme).toBe("dark")
  expect(screen.getByRole("button", { name: "Ativar modo claro" })).toHaveAttribute("aria-pressed", "true")
})

test("toggle is keyboard operable", async () => {
  renderRoute("/")
  const user = userEvent.setup()
  const toggle = await screen.findByRole("button", { name: "Ativar modo escuro" })

  toggle.focus()
  await user.keyboard("[Enter]")

  expect(document.documentElement.dataset.theme).toBe("dark")
  expect(screen.getByRole("button", { name: "Ativar modo claro" })).toHaveAttribute("aria-pressed", "true")
})
```

- [ ] **Step 2: Run tests to capture initial failure**

Run: `npm --prefix frontend run test -- router.test.tsx`
Expected: FAIL because toggle does not exist yet.

- [ ] **Step 3: Implement toggle control and CSS variable usage**

```tsx
// frontend/src/shared/ui/AppShell.tsx (key additions)
import { useTheme } from "../../app/theme/ThemeProvider"

const THEME_LABEL = {
  light: "Ativar modo escuro",
  dark: "Ativar modo claro",
} as const

// in AppShell
const { theme, toggleTheme } = useTheme()
const isDark = theme === "dark"

<button
  type="button"
  onClick={toggleTheme}
  aria-label={THEME_LABEL[theme]}
  aria-pressed={isDark}
  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] text-[var(--nav-link-text)] hover:bg-[var(--shell-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-focus)]"
>
  {isDark ? <span aria-hidden="true">☾</span> : <span aria-hidden="true">☀</span>}
</button>
```

```css
/* frontend/src/styles.css (phase-1 tokens) */
:root {
  color-scheme: light;
  --shell-bg-start: #f1f5f9;
  --shell-bg-end: #ffffff;
  --shell-text: #0f172a;
  --shell-surface: #ffffff;
  --shell-border: #e2e8f0;
  --shell-hover: #e2e8f0;
  --shell-focus: #0f7431;
  --nav-link-active: #0f7431;
  --nav-link-text: #3f4a57;
  --brand-text: #5f6d7a;
}

[data-theme="dark"] {
  color-scheme: dark;
  --shell-bg-start: #0b1220;
  --shell-bg-end: #111827;
  --shell-text: #e5e7eb;
  --shell-surface: #111827;
  --shell-border: #1f2937;
  --shell-hover: #1f2937;
  --shell-focus: #86efac;
  --nav-link-active: #86efac;
  --nav-link-text: #cbd5e1;
  --brand-text: #94a3b8;
}
```

- [ ] **Step 4: Run route tests and full frontend tests**

Run: `npm --prefix frontend run test -- router.test.tsx`
Expected: PASS.

Run: `npm --prefix frontend run test`
Expected: PASS with no regressions.

- [ ] **Step 5: Run build verification**

Run: `npm --prefix frontend run build`
Expected: PASS and generated bundle in `frontend/dist`.

- [ ] **Step 6: Commit AppShell and style migration**

```bash
git add frontend/src/shared/ui/AppShell.tsx frontend/src/styles.css frontend/src/app/router.test.tsx
git commit -m "feat: add app shell theme toggle and tokenized shell colors"
```

### Task 5: Final verification and integration check

**Files:**
- Modify (if needed): `docs/superpowers/specs/2026-03-17-frontend-theme-toggle-design.md` (only if implementation-discovered spec mismatch requires clarification)

- [ ] **Step 1: Run complete repo tests required by project guidance**

Run: `go test ./...`
Expected: PASS.

Run: `make test`
Expected: PASS.

- [ ] **Step 2: Run focused frontend smoke checks**

Run: `npm --prefix frontend run dev`
Expected manual checks:
- Open `/` and verify toggle is before `Início` in the nav.
- Press `Tab` then `Enter` on toggle and verify `<html data-theme>` changes.
- Navigate to `/historical` and back to `/`; both pages still render correctly.

- [ ] **Step 3: Manual acceptance checklist**

Expected checks:
- Cold load with no stored key honors system preference.
- Clicking toggle updates `<html data-theme>` and persists to `localStorage` key `atmosbyte-theme`.
- Toggle button remains keyboard reachable and shows Portuguese labels.
- No horizontal overflow at `360x640` and `1440x900`.

- [ ] **Step 4: Final commit for any remaining adjustments**

```bash
git add frontend/index.html frontend/src/app/AppProviders.tsx frontend/src/app/router.test.tsx frontend/src/app/theme/themeResolver.ts frontend/src/app/theme/themeResolver.test.ts frontend/src/app/theme/themeBootstrap.ts frontend/src/app/theme/themeBootstrap.test.ts frontend/src/app/theme/ThemeProvider.tsx frontend/src/app/theme/ThemeProvider.test.tsx frontend/src/shared/ui/AppShell.tsx frontend/src/styles.css
git commit -m "test: finalize theme toggle integration verification"
```

## Skills To Apply During Execution

- `@vercel-react-best-practices` for React state/effects and rerender hygiene.
- `@next-best-practices` only where frontend entry/script ordering guidance overlaps Vite integration.
