# Design Spec: Frontend Dark/Light Theme Toggle in AppShell

Date: 2026-03-17  
Status: Approved in brainstorming (ready for spec review)

## 1) Context and Goal

Add phase-1 dark/light mode support to the React frontend in `./frontend`, scoped to `AppShell` and shell/navigation surfaces, with a theme toggle icon placed on the left side of navigation links inside `AppShell`.

The theme should:

- Default to system preference on first load.
- Persist user choice across reloads.
- Use an icon-only control with accessible labeling.

## 2) Validated Decisions

- Initial theme source order: persisted user preference first, system preference second.
- User toggle choice persists in `localStorage`.
- Storage key is fixed as `atmosbyte-theme`.
- Theme toggle placement: standalone icon button before the first `NavLink` in `AppShell`.
- Toggle style: icon-only button with Portuguese `aria-label` strings (`Ativar modo escuro` / `Ativar modo claro`).

## 3) Non-Goals (YAGNI)

- No redesign of existing page layout or information architecture.
- No broad visual refactor outside theme-related color tokens.
- No live auto-switching when OS preference changes after a user has explicitly chosen a theme.
- No runtime subscription to OS theme changes; system preference is read at startup only.

## 4) Architecture

Introduce a small theme boundary at app root via a `ThemeProvider` that owns theme state and exposes `toggleTheme` through context.

Theme application model:

- Provider writes `data-theme="light" | "dark"` to `document.documentElement`.
- `:root` is the light baseline; dark overrides are defined only under `[data-theme="dark"]`.
- Components consume variables instead of hard-coded color values where needed.
- To avoid first-paint theme flash, initialize `data-theme` before first paint with a tiny bootstrap script in app entry HTML that uses the same resolution rule (storage, then system preference). This must run synchronously before React mount.
- Bootstrap and provider use one shared pure resolver utility (same storage key, valid values, and precedence) to avoid drift.
- Bootstrap script must wrap storage and `matchMedia` access in `try/catch`, never throw, and default to `light` on bootstrap errors.

This keeps theme logic isolated and makes future theme-aware UI changes incremental.

## 5) Components and Data Flow

### 5.1 ThemeProvider

Responsibilities:

- Initialize from existing valid `document.documentElement.dataset.theme` when present (set by bootstrap).
- If dataset value is missing/invalid, use the shared resolver (`localStorage` key `atmosbyte-theme`, then system preference).
- Persist updated value after toggles on a best-effort basis.
- Synchronize `document.documentElement.dataset.theme` whenever state changes.

Public context surface:

- `theme: "light" | "dark"`
- `toggleTheme(): void`

### 5.2 AppShell Toggle

- Add an icon-only `button` before the first `NavLink` in `AppShell` nav flow.
- Button triggers `toggleTheme` from context.
- Accessible label indicates action, using fixed Portuguese strings:
  - `Ativar modo escuro` when current mode is light.
  - `Ativar modo claro` when current mode is dark.

### 5.3 Styling Layer

- Define base tokens under `:root`.
- Define dark overrides under `[data-theme="dark"]`.
- Migrate key shell/nav colors used in `AppShell` to token-driven values.

Data flow:

1. Bootstrap runs before React mount and sets `<html data-theme="...">`.
2. `ThemeProvider` initializes from existing valid `document.documentElement.dataset.theme`; only falls back to resolver when missing/invalid.
3. CSS variables apply theme-specific colors.
4. User clicks icon -> `toggleTheme` -> state, best-effort storage write, and `data-theme` update.

## 6) Error Handling and Edge Cases

- If `localStorage` is unavailable or throws on read/write, do not throw; continue with in-memory runtime theme only. On next reload, re-derive from system preference.
- If stored value is invalid, ignore it and use system preference.
- If `matchMedia` is unavailable, default to light mode.
- Toggle remains keyboard accessible via native `button` semantics and visible focus styles.
- Toggle exposes a non-empty Portuguese `aria-label` and `aria-pressed` that reflects current theme state.

## 7) Testing Strategy

Frontend tests should cover:

- Theme initialization from valid persisted value.
- Fallback to system preference when persisted value is absent/invalid.
- Fallback to light when `matchMedia` is unavailable.
- Graceful behavior when `localStorage` read/write throws.
- Theme toggle updates both `document.documentElement.dataset.theme` and storage.
- `AppShell` toggle renders before the first `NavLink`.
- Toggle `aria-label` changes according to current theme.
- Toggle `aria-pressed` reflects current state and can be activated by keyboard.
- Bootstrap and provider theme resolution produce identical output for the same mocked inputs (parity test over storage/system combinations).
- Bootstrap path is resilient: when bootstrap storage/media access throws, app still mounts and `<html data-theme="light">` is applied.

Regression checks:

- Existing route navigation behavior remains unchanged.
- At `360x640` and `1440x900`, nav and toggle remain visible/operable with no overlap or clipping in both themes.
- Cold-load check: with no stored value and dark system preference, `<html data-theme="dark">` is present before React app mount.

## 8) Acceptance Criteria

- When rendering app root, descendants consuming theme context receive `theme` and can call `toggleTheme` without errors.
- Pre-paint theme initialization sets `<html data-theme>` before the React application mounts using the same storage/system rule.
- First load follows system theme when no persisted value exists.
- User theme choice persists and takes precedence on subsequent loads.
- `AppShell` includes icon-only toggle button before first nav link.
- `AppShell` toggle has non-empty Portuguese `aria-label` and correct `aria-pressed` state.
- Dark and light visual states are applied via CSS variables driven by `data-theme`.
- When `localStorage.setItem` throws, toggle still updates `<html data-theme>` for the current session.
- Nav regression test confirms existing `AppShell` links still navigate to their expected routes.
- No horizontal overflow at `360x640` and `1440x900` after adding the toggle.
