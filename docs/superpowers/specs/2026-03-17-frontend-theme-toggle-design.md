# Design Spec: Frontend Dark/Light Theme Toggle in AppShell

Date: 2026-03-17  
Status: Approved in brainstorming (ready for spec review)

## 1) Context and Goal

Add dark/light mode support to the React frontend in `./frontend`, with a theme toggle icon placed on the left side of navigation links inside `AppShell`.

The theme should:

- Default to system preference on first load.
- Persist user choice across reloads.
- Use an icon-only control with accessible labeling.

## 2) Validated Decisions

- Initial theme source order: persisted user preference first, system preference second.
- User toggle choice persists in `localStorage`.
- Theme toggle placement: standalone icon button before the first `NavLink` in `AppShell`.
- Toggle style: icon-only button with `aria-label`.

## 3) Non-Goals (YAGNI)

- No redesign of existing page layout or information architecture.
- No broad visual refactor outside theme-related color tokens.
- No live auto-switching when OS preference changes after a user has explicitly chosen a theme.

## 4) Architecture

Introduce a small theme boundary at app root via a `ThemeProvider` that owns theme state and exposes `toggleTheme` through context.

Theme application model:

- Provider writes `data-theme="light" | "dark"` to `document.documentElement`.
- Global CSS variables in `frontend/src/styles.css` define light values and dark overrides under `[data-theme="dark"]`.
- Components consume variables instead of hard-coded color values where needed.

This keeps theme logic isolated and makes future theme-aware UI changes incremental.

## 5) Components and Data Flow

### 5.1 ThemeProvider

Responsibilities:

- Read initial value from `localStorage` key (for example `atmosbyte-theme`).
- Validate stored value (`light` or `dark` only).
- Fall back to system preference (`prefers-color-scheme: dark`) when no valid stored value exists.
- Persist updated value after toggles.
- Synchronize `document.documentElement.dataset.theme` whenever state changes.

Public context surface:

- `theme: "light" | "dark"`
- `toggleTheme(): void`

### 5.2 AppShell Toggle

- Add an icon-only `button` before the first `NavLink` in `AppShell` nav flow.
- Button triggers `toggleTheme` from context.
- Accessible label indicates action, e.g.:
  - `Ativar modo escuro` when current mode is light.
  - `Ativar modo claro` when current mode is dark.

### 5.3 Styling Layer

- Define base tokens under `:root` or `[data-theme="light"]`.
- Define dark overrides under `[data-theme="dark"]`.
- Migrate key shell/nav colors used in `AppShell` to token-driven values.

Data flow:

1. App loads and provider computes initial theme.
2. Provider updates `<html data-theme="...">`.
3. CSS variables apply theme-specific colors.
4. User clicks icon -> `toggleTheme` -> state, storage, and `data-theme` update.

## 6) Error Handling and Edge Cases

- If `localStorage` is unavailable or throws, continue with in-memory theme and system fallback.
- If stored value is invalid, ignore it and use system preference.
- If `matchMedia` is unavailable, default to light mode.
- Keep interaction keyboard accessible via native `button` semantics and focus-visible styles.

## 7) Testing Strategy

Frontend tests should cover:

- Theme initialization from valid persisted value.
- Fallback to system preference when persisted value is absent/invalid.
- Theme toggle updates both `document.documentElement.dataset.theme` and storage.
- `AppShell` toggle renders before the first `NavLink`.
- Toggle `aria-label` changes according to current theme.

Regression checks:

- Existing route navigation behavior remains unchanged.
- Layout remains usable on desktop and mobile in both themes.

## 8) Acceptance Criteria

- Theme provider exists and is wired at app root.
- First load follows system theme when no persisted value exists.
- User theme choice persists and takes precedence on subsequent loads.
- `AppShell` includes icon-only toggle button before first nav link.
- `AppShell` toggle has meaningful `aria-label` for assistive tech.
- Dark and light visual states are applied via CSS variables driven by `data-theme`.
- Existing navigation behavior and routes continue to work.
