# Design Spec: Mobile-Safe Datetime Inputs in HistoricalFiltersForm

Date: 2026-03-17  
Status: Approved in brainstorming (ready for spec review)

## 1) Context and Goal

User feedback reports that on mobile, the historical page date picker field appears cut inside its card. The visible card border remains, but part of the datetime field is missing.

Goal: make `datetime-local` fields fit entirely within the historical filters card on mobile, without clipping, overflow, or behavior changes.

This spec follows a focus-first scope: fix the rendering issue directly and standardize the solution for reuse, while avoiding unrelated feature work.

## 2) Validated Decisions

- Reuse-first approach: create a shared mobile-safe style contract for `input[type="datetime-local"]`.
- Keep one-field date+time input model (`datetime-local`) on mobile and desktop.
- Allow CSS plus responsive layout adjustments where needed.
- Preserve all filtering behavior (`from`, `to`, `type`, apply/export flow, validation).

## 3) Non-Goals (YAGNI)

- No change to filter logic, API contracts, or state shape.
- No conversion to custom date picker libraries.
- No split date/time inputs on mobile.
- No domain/entity changes (including debt status storage semantics).

Note on backlog alignment: the request constraint mentioning `debt_status` is tracked as out-of-scope for this UI bugfix. It should be handled in a dedicated domain/data-model spec to preserve prioritization and separation of concerns.

## 4) Architecture

Apply a presentation-layer fix through reusable styling boundaries:

- Define a shared datetime input utility class for mobile-safe sizing.
- Ensure container shrink behavior is explicit (`min-width: 0`) on relevant wrappers.
- Keep card and grid structure intact with only minimal responsive tweaks.

This isolates the fix to frontend styling and layout contracts while preventing future regressions where `datetime-local` controls appear in constrained containers.

## 5) Components and Data Flow

### 5.1 Shared Datetime Utility

Create a shared class (for example, `app-datetime-input`) that guarantees:

- `width: 100%`
- `max-width: 100%`
- `min-width: 0`
- `box-sizing: border-box`
- Mobile-safe text sizing and intrinsic width containment for browser datetime controls

The class is additive and used alongside existing visual classes.

### 5.2 HistoricalFiltersForm Integration

In `HistoricalFiltersForm`:

- Apply the shared datetime utility class to both `from` and `to` datetime inputs.
- Ensure parent wrappers (`label`/grid items) retain shrink-safe rules.
- Keep select and button behavior unchanged, with small responsive alignment adjustments only if needed to avoid wrapping artifacts.

### 5.3 Data Flow (Unchanged)

Data and events remain unchanged:

1. User updates `from`/`to`/`type`.
2. Existing state setters update local state.
3. Apply/export actions run existing validation.
4. Valid values continue through current `onApply`/`onExport` callbacks.

## 6) Error Handling and Edge Cases

- No new runtime error handling paths are introduced.
- Existing invalid date/range validation messages remain unchanged.
- Primary risk shifts to visual regressions; mitigate via responsive checks.
- Cross-browser edge case addressed: intrinsic datetime control sizing on mobile browsers must not exceed container width.

## 7) Testing Strategy

Manual and regression checks:

- Validate historical filters at narrow widths (`320px`, `360px`, `390px`) in portrait mode.
- Confirm both datetime inputs render fully inside card boundaries.
- Confirm no horizontal scrolling introduced by the filters card.
- Verify desktop/tablet layouts remain intact.
- Verify apply/export and validation behavior still match current behavior.

If automated UI tests exist for responsive rendering, add assertions for:

- Datetime fields are visible and not clipped at mobile breakpoints.
- Filters card does not overflow horizontally.

## 8) Acceptance Criteria

- On mobile widths (`<= 390px`), both historical datetime inputs are fully visible within card boundaries.
- No clipping or horizontal overflow occurs in the filters card.
- `HistoricalFiltersForm` filtering behavior remains unchanged.
- A shared datetime style utility exists and is used by `HistoricalFiltersForm`.
- Existing desktop behavior is preserved.

## 9) Implementation Plan (High Level)

1. Add shared mobile-safe datetime input utility style in frontend shared styling.
2. Update `HistoricalFiltersForm` date inputs to use the shared utility.
3. Apply minimal responsive container/layout adjustments to prevent clipping.
4. Run frontend checks and responsive validation.
