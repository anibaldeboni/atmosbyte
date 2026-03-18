# Historical Filters Mobile Date Picker Sizing Design

Date: 2026-03-17
Area: `frontend/src/features/historical/HistoricalFiltersForm.tsx`
Status: Approved for planning

## Problem Statement

On mobile, the Historical page date picker input is visually clipped inside the filters card. Users can see the card border while part of the field is missing. This harms focus and prioritization because the primary filter controls are not fully legible or reliably tappable.

The current implementation uses native browser `datetime-local` inputs, which render inconsistently across mobile browsers and can overflow or truncate in constrained grid/card layouts.

## Goals

- Eliminate mobile clipping/truncation for both date-time fields in `HistoricalFiltersForm`.
- Restore focus and prioritization of the primary filter controls by guaranteeing full legibility and a clear visible focus state on mobile.
- Refactor from native `datetime-local` to `react-datepicker`.
- Keep date + time selection behavior.
- Add a right-aligned calendar icon in each input, clickable to focus/open the picker.
- Preserve existing validation semantics (`from <= to`) and current apply/export flow.
- Keep styling aligned to the existing frontend color palette and control system.

## Non-Goals

- No auto-correction behavior (no date auto-swap).
- No changes to backend API contracts.
- No unrelated form/layout redesign beyond what is necessary for reliable mobile fit.

## Selected Approach

Recommended approach: `react-datepicker` with a custom input wrapper and responsive sizing constraints.

Why this approach:

- Gives explicit control over field sizing and icon placement on small screens.
- Avoids native browser control rendering quirks that caused clipping.
- Preserves current behavior while improving consistency and usability.

Alternatives considered:

1. Built-in `react-datepicker` input plus CSS overrides only
   - Faster initially, but less robust and more fragile across browser/library updates.
2. Separate mobile and desktop picker implementations
   - Better tailoring, but introduces duplicated logic and higher maintenance.

## Design Details

## 1) Architecture and Components

- Keep `HistoricalFiltersForm` as the state owner for `from`, `to`, and `type`.
- Replace both native date-time inputs with two `react-datepicker` instances.
- Use a custom input component/wrapper (local to historical feature or shared UI, following repo conventions) that provides:
  - `w-full` and `min-w-0` sizing behavior,
  - right-side padding for icon clearance,
  - right-aligned clickable calendar icon,
  - palette-compliant border, text, and focus styles.
- Maintain adaptive layout:
  - small screens: stacked fields,
  - tablet and up: existing multi-column layout behavior.

## 2) Data Flow and Behavior

- Keep existing defaults: `from = now - 24h`, `to = now`.
- Continue first-render auto-load behavior via `onApply(values)` once.
- State contract is explicit: `from` and `to` remain string state in `YYYY-MM-DDTHH:mm` local format.
- `react-datepicker` `Date | null` values are derived for UI only and converted back to the same local string format on change; do not use `toISOString()` for outbound payloads.
- Preserve callback payload shape and format exactly as today. Payload contract is normative: `onApply` and `onExport` must receive `{ from, to, type }` where `from` and `to` are serialized as local datetime strings in `YYYY-MM-DDTHH:mm` format (no seconds, no timezone suffix), matching native `datetime-local` output exactly.
- Both controls must allow date and time selection (not date-only), using normative `react-datepicker` configuration: enable `showTimeSelect` and set time format and interval to match current behavior exactly (same minute granularity and interaction flow).
- Preserve event paths:
  - `Carregar` -> validate -> `onApply(values)`
  - `Exportar CSV` -> validate -> `onExport(values)`

## 3) Validation and Error Handling

- Keep current validation rules unchanged:
  - both values must parse as valid dates,
  - `from <= to`.
- Keep current error channel and style (`InlineAlert`).
- Do not silently mutate user input on invalid ranges.

## 4) Styling and Accessibility

- Use existing frontend palette tokens/classes already used by form controls.
- Ensure icon button is keyboard-focusable and screen-reader compatible.
- Keep labels (`De`, `Até`) as accessible names for the corresponding controls.
- Ensure touch target is usable on mobile and does not overlap text content.

## Acceptance Criteria

1. On common mobile widths, neither date-time field is clipped or truncated in the historical filters card.
2. At 320px, 360px, and 390px widths, both date fields are fully visible on initial render and expose a visible focus ring when keyboard-focused (no clipping, no overlap, no hidden interactive affordance).
3. Both fields support selecting date + time via `react-datepicker` without losing current interaction flow.
4. Each field shows a right-aligned calendar icon that is clickable/tappable and opens/focuses the picker.
5. Existing validation behavior and error messages remain intact.
6. `Carregar` and `Exportar CSV` continue using the same validated values contract and payload format as before the migration.
7. Visual styling matches the existing frontend palette and nearby controls.
8. At viewport widths below `768px`, `De` and `Até` render as stacked full-width rows; at `768px` and above, they render side-by-side in the existing multi-column layout, with no clipping or overflow in either mode.

## Test Plan

- Manual mobile viewport verification (e.g., 320px, 360px, 390px widths):
  - no clipping,
  - icon alignment/tap behavior,
  - readable values.
- Manual browser verification must include iOS Safari and Android Chrome at 320px, 360px, and 390px widths, validating that both inputs and the opened picker UI are fully visible, tappable, and not clipped by card/container overflow.
- Functional checks:
  - valid range applies/exports,
  - invalid range blocks action and shows error.
- Automated checks:
  - unchanged validation behavior for valid and invalid ranges,
  - no auto-swap on invalid range,
  - callback payload format parity before and after migration,
  - icon click opens/focuses the picker.
- Regression checks on tablet/desktop:
  - adaptive layout remains stable,
  - initial auto-load behavior unchanged.

## Risks and Mitigations

- Risk: date serialization mismatch when switching to `Date` objects.
  - Mitigation: keep transformation utilities explicit and covered by unit/component tests where present.
- Risk: icon overlay affecting text readability.
  - Mitigation: reserve input right padding and test long localized values in narrow widths.

## Implementation Boundary

This design document defines the approved solution scope only. Implementation planning is the next phase and should be produced via the `writing-plans` skill after spec review and user sign-off.
