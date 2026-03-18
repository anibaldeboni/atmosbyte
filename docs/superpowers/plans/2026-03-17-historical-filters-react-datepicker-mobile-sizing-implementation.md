# Historical Filters React Datepicker Mobile Sizing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace native historical date-time inputs with `react-datepicker` so mobile fields render fully, keep date+time behavior, and add right-aligned clickable calendar icons without changing filter payload/validation contracts.

**Architecture:** Keep `HistoricalFiltersForm` as the single owner of filter state (`from`, `to`, `type`) and validation logic. Introduce a focused date-time utility for local `YYYY-MM-DDTHH:mm` parsing/formatting parity, then integrate `react-datepicker` with a custom input wrapper that reserves icon space, uses palette-aware styles, and opens from icon taps. Use portal/fixed popper strategy so calendar UI is not clipped by card overflow and verify with targeted historical tests.

**Tech Stack:** React 19, TypeScript, `react-datepicker`, existing CSS variables in `frontend/src/styles.css`, Jest + React Testing Library.

---

## File Structure

- Create: `frontend/src/features/historical/dateTimeLocal.ts`
  - Responsibility: single source of truth for converting local `Date` <-> `YYYY-MM-DDTHH:mm` strings used by historical filters.
- Create: `frontend/src/features/historical/dateTimeLocal.test.ts`
  - Responsibility: contract tests for serialization/parsing parity and invalid input handling.
- Modify: `frontend/src/features/historical/HistoricalFiltersForm.tsx`
  - Responsibility: replace native inputs with `react-datepicker`, keep existing validation semantics, and add right-aligned clickable calendar icon controls.
- Modify: `frontend/src/styles.css`
  - Responsibility: apply palette-compliant styles for date picker input/popup/focus states and z-index safety.
- Modify: `frontend/src/main.tsx`
  - Responsibility: load base `react-datepicker` stylesheet before overrides.
- Modify: `frontend/src/features/historical/historical.test.tsx`
  - Responsibility: preserve existing historical behavior tests and add icon/open interaction and payload contract checks.
- Modify: `frontend/package.json` and lockfile (`frontend/package-lock.json`)
  - Responsibility: add `react-datepicker` dependency.

## Chunk 1: Contract and dependency groundwork

### Task 1: Add local date-time conversion contract with failing-first tests

**Files:**
- Create: `frontend/src/features/historical/dateTimeLocal.test.ts`
- Create: `frontend/src/features/historical/dateTimeLocal.ts`

- [ ] **Step 1: Write failing tests for local datetime format contract**

```ts
import {
  fromDateToLocalDateTime,
  fromLocalDateTimeToDate,
} from "./dateTimeLocal"

test("formats Date to local YYYY-MM-DDTHH:mm without timezone suffix", () => {
  const value = fromDateToLocalDateTime(new Date("2026-03-17T10:45:33.000Z"))
  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  expect(value.includes("Z")).toBe(false)
})

test("round-trips local datetime string without changing minute precision", () => {
  const input = "2026-03-17T10:45"
  const parsed = fromLocalDateTimeToDate(input)
  expect(parsed).not.toBeNull()
  expect(fromDateToLocalDateTime(parsed as Date)).toBe(input)
})

test("returns null for invalid local datetime strings", () => {
  expect(fromLocalDateTimeToDate("")).toBeNull()
  expect(fromLocalDateTimeToDate("invalid")).toBeNull()
  expect(fromLocalDateTimeToDate("2026-03-17")).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify failure first**

Run: `npm --prefix frontend run test -- dateTimeLocal.test.ts`
Expected: FAIL with module/export-not-found errors.

- [ ] **Step 3: Implement minimal conversion utilities**

```ts
export function fromDateToLocalDateTime(date: Date): string {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000
  const localDate = new Date(date.getTime() - timezoneOffsetMs)
  return localDate.toISOString().slice(0, 16)
}

export function fromLocalDateTimeToDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return null
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm --prefix frontend run test -- dateTimeLocal.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit utility contract**

```bash
git add frontend/src/features/historical/dateTimeLocal.ts frontend/src/features/historical/dateTimeLocal.test.ts
git commit -m "test: define historical local datetime conversion contract"
```

### Task 2: Add `react-datepicker` dependency and base stylesheet wiring

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Add dependency and update lockfile**

Run: `npm --prefix frontend install react-datepicker`
Expected: dependency appears in `frontend/package.json` and lockfile updates.

- [ ] **Step 2: Import datepicker base CSS in app entry**

```ts
// frontend/src/main.tsx
import "react-datepicker/dist/react-datepicker.css"
import "./styles.css"
```

- [ ] **Step 3: Verify compile and tests still run with new dependency**

Run: `npm --prefix frontend run build`
Expected: PASS.

Run: `npm --prefix frontend run test -- historical.test.tsx`
Expected: tests may fail later due pending picker refactor, but runner starts without missing-module errors.

- [ ] **Step 4: Commit dependency/wiring changes**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/main.tsx
git commit -m "build: add react-datepicker dependency and base styles import"
```

## Chunk 2: Historical filter refactor and behavior verification

### Task 3: Refactor `HistoricalFiltersForm` to `react-datepicker` with icon-first mobile UX

**Files:**
- Modify: `frontend/src/features/historical/historical.test.tsx`
- Modify: `frontend/src/features/historical/HistoricalFiltersForm.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add failing integration assertions for icon and adaptive behavior**

Add/extend tests in `frontend/src/features/historical/historical.test.tsx`:

```tsx
test("renders clickable right-side calendar icons for both datetime fields", async () => {
  mockedClient.getHistorical.mockResolvedValue([])
  render(<HistoricalPage />)

  await waitFor(() => expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1))

  expect(screen.getByRole("button", { name: "Abrir calendário De" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Abrir calendário Até" })).toBeInTheDocument()
})

test("opens picker when calendar icon is clicked", async () => {
  mockedClient.getHistorical.mockResolvedValue([])
  render(<HistoricalPage />)

  await waitFor(() => expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1))

  fireEvent.click(screen.getByRole("button", { name: "Abrir calendário De" }))
  expect(document.querySelector(".react-datepicker")).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to confirm failure before refactor**

Run: `npm --prefix frontend run test -- historical.test.tsx -t "renders clickable right-side calendar icons"`
Expected: FAIL because icon buttons do not exist in current native input implementation.

- [ ] **Step 3: Replace native inputs with datepicker + custom input wrapper**

Implementation direction in `frontend/src/features/historical/HistoricalFiltersForm.tsx`:

```tsx
import DatePicker from "react-datepicker"
import { forwardRef, useMemo, useRef, useState } from "react"
import { fromDateToLocalDateTime, fromLocalDateTimeToDate } from "./dateTimeLocal"

type PickerInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  onCalendarClick: () => void
  calendarLabel: string
}

const PickerInput = forwardRef<HTMLInputElement, PickerInputProps>(function PickerInput(
  { onCalendarClick, calendarLabel, ...props },
  ref,
) {
  return (
    <span className="historical-datepicker-input-wrap mt-1 block">
      <input ref={ref} {...props} className="historical-field-control historical-datepicker-input block w-full min-w-0 rounded-md border px-3 py-2 pr-11 text-[16px]" />
      <button
        type="button"
        aria-label={calendarLabel}
        className="historical-datepicker-icon"
        onClick={onCalendarClick}
      >
        {/* calendar svg */}
      </button>
    </span>
  )
})

// Keep string state contract
const [from, setFrom] = useState(fromDateToLocalDateTime(...))
const fromDate = useMemo(() => fromLocalDateTimeToDate(from), [from])

<DatePicker
  selected={fromDate}
  onChange={(value) => value instanceof Date && setFrom(fromDateToLocalDateTime(value))}
  showTimeSelect
  timeIntervals={1}
  dateFormat="yyyy-MM-dd'T'HH:mm"
  popperPlacement="bottom-start"
  popperProps={{ strategy: "fixed" }}
  portalId="root"
  customInput={<PickerInput onCalendarClick={() => setFromOpen(true)} calendarLabel="Abrir calendário De" />}
  open={fromOpen}
  onInputClick={() => setFromOpen(true)}
  onClickOutside={() => setFromOpen(false)}
  onSelect={() => setFromOpen(false)}
/
```

Checklist while implementing this step:
- Keep validation semantics exactly (`from <= to`, same error strings).
- Keep `onApply` auto-load-once behavior unchanged.
- Keep state payload as `YYYY-MM-DDTHH:mm` local strings.
- Ensure mobile-friendly full width with `min-w-0` and no control clipping.
- Remove/adjust card overflow clipping behavior and/or rely on portal so popup is not cut off.

- [ ] **Step 4: Add/adjust CSS for palette + focus + popup layering**

Add styles in `frontend/src/styles.css` using existing palette tokens:

```css
.historical-datepicker-input-wrap { position: relative; }
.historical-datepicker-input { padding-right: 2.75rem; }
.historical-datepicker-icon {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--historical-field-label);
}
.react-datepicker-popper { z-index: 40; }
.react-datepicker,
.react-datepicker__header,
.react-datepicker__time-container {
  background-color: var(--historical-field-bg);
  border-color: var(--historical-field-border);
  color: var(--historical-field-text);
}
```

Also ensure filter card does not clip interactive picker content on mobile:
- remove `overflow-hidden` from the `historical-filters-card` wrapper class usage in the form (or justify equivalent non-clipping strategy).

- [ ] **Step 5: Run focused historical tests and fix regressions**

Run: `npm --prefix frontend run test -- historical.test.tsx`
Expected: PASS with existing validation/export tests and new icon assertions.

- [ ] **Step 6: Commit refactor and style updates**

```bash
git add frontend/src/features/historical/HistoricalFiltersForm.tsx frontend/src/styles.css frontend/src/features/historical/historical.test.tsx
git commit -m "feat: migrate historical filters to react-datepicker for mobile fit"
```

### Task 4: Verify payload parity, accessibility, and responsive behavior

**Files:**
- Modify (if needed): `frontend/src/features/historical/historical.test.tsx`
- Modify (if needed): `docs/superpowers/specs/2026-03-17-historical-filters-react-datepicker-mobile-sizing-design.md` (only if implementation uncovers a spec mismatch)

- [ ] **Step 1: Add payload contract assertion (from/to format unchanged)**

In `historical.test.tsx`, assert request query includes local datetime strings with `T` separator and no seconds suffix for user-edited values.

```tsx
expect(mockedClient.getHistorical).toHaveBeenLastCalledWith(
  expect.objectContaining({
    from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  }),
)
```

Also assert export path preserves the same format contract:

```tsx
fireEvent.click(screen.getByRole("button", { name: "Exportar CSV" }))
const exportUrl = (window.location.assign as jest.Mock).mock.calls.at(-1)?.[0] as string
const parsed = new URL(exportUrl, "http://localhost")
expect(parsed.searchParams.get("from")).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
expect(parsed.searchParams.get("to")).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
```

- [ ] **Step 2: Run full frontend tests**

Run: `npm --prefix frontend run test`
Expected: PASS.

- [ ] **Step 3: Run frontend production build**

Run: `npm --prefix frontend run build`
Expected: PASS and bundle generated in `frontend/dist`.

- [ ] **Step 4: Manual responsive and browser checks**

Run: `npm --prefix frontend run dev`

Manual checklist:
- iOS Safari and Android Chrome: widths 320, 360, 390.
- Both `De` and `Até` inputs fully visible at initial render (no clipping/truncation).
- Calendar icon is right-aligned and opens picker when tapped.
- `De`/`Até` stack on mobile and remain side-by-side at `md` and up.
- Keyboard focus ring is visible on input and icon button.
- `Carregar` and `Exportar CSV` still work with unchanged validation behavior.

Expected: all checklist items pass in both browsers with no clipping regressions and no interaction blockers.

- [ ] **Step 5: Commit final verification updates**

```bash
git add frontend/src/features/historical/historical.test.tsx
git commit -m "test: verify historical datepicker payload and mobile interactions"
```

## Skills To Apply During Execution

- `@frontend-design` for preserving coherent control composition in existing UI patterns.
- `@ui-ux-pro-max` for input/icon interaction quality and mobile ergonomics.
- `@web-design-guidelines` for focus visibility and accessibility checks.
- `@vercel-react-best-practices` for controlled state/update hygiene in React components.
