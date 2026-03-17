# Design Spec: React 19 Migration for `web/templates` and `web/static`

Date: 2026-03-17  
Status: Approved in brainstorming (ready for spec review)

## 1) Context and Goal

Migrate the current server-rendered frontend (`web/templates` + `web/static`) to a React 19 + TypeScript single-page application in `./frontend`, with reusable components, utility-first Tailwind CSS styling, and Jest component testing.

The migrated frontend must continue using the existing Go backend APIs and be served by the current Go web server, with the frontend bundle embedded in the compiled Go binary.

## 2) Validated Decisions

- Runtime model: SPA with client-side routing.
- UI library stack: React 19 + TypeScript.
- Chart library: Recharts.
- Styling approach: full Tailwind-only in frontend (no legacy CSS carryover into SPA).
- Backend routing model: serve SPA fallback (`index.html`) for non-API routes.
- Testing scope: critical-path Jest component coverage.
- Rollout strategy: big-bang cutover (single release switch).
- Additional UX requirement: skeleton loading for not-yet-loaded components.
- Additional build requirement: add `make run` to bundle SPA and run app locally.
- Template-injected values used by old HTML must be removed end-to-end (UI and backend support code).
- TypeScript rule: never use the `any` type; use explicit interfaces, unions, generics, or `unknown` with narrowing.

## 3) Non-Goals (YAGNI)

- No introduction of a second frontend framework.
- No redesign of backend weather/queue/repository domain logic.
- No API contract breaks for existing endpoints used by frontend.
- No long-term dual maintenance of old templates and new SPA.

## 4) Architecture

### 4.1 Frontend App

- New React 19 SPA in `frontend`.
- Client routes:
  - `/` -> Home
  - `/historical` -> Historical view
  - `*` -> SPA NotFound view
- UI is assembled from reusable React components and feature modules.

### 4.2 Backend Serving Model

- Frontend build output is generated to `frontend/dist`.
- `frontend/dist/**` assets are embedded into the Go binary via `embed.FS`.
- Go serves embedded hashed frontend assets.
- Go serves embedded SPA `index.html` as fallback for non-API routes.
- Existing API routes remain explicit and keep their contracts.

### 4.3 Routing Priority (Backend)

1. All registered API handlers (not a fixed hardcoded list)
2. Frontend static bundle asset routes
3. SPA fallback to embedded `index.html` for all other non-API paths

Implementation rule: SPA fallback executes only after API handler matching fails for every registered API route.

### 4.4 SPA Fallback and Asset Resolution Rules

- Known embedded frontend asset paths resolve to their files (for example, hashed files under `/assets/*` and required root assets produced by bundler).
- API routes always bypass SPA fallback.
- Any non-API request with a file extension returns `404` unless the embedded file exists (for example `*.js`, `*.css`, `*.map`, `*.ico`, `*.webmanifest`, `*.txt`).
- Unknown `/assets/*` files return `404` and are not rewritten to SPA `index.html`.
- Non-API browser navigation routes return embedded SPA `index.html`.

## 5) Frontend Structure and Componentization

Proposed high-level structure in `frontend/src`:

- `app/` - app bootstrap, router, global providers.
- `pages/` - route screens (`HomePage`, `HistoricalPage`, `NotFoundPage`).
- `features/status/` - shared status polling and normalization logic.
- `features/current-metrics/` - realtime weather metric cards.
- `features/historical/` - filters, historical query orchestration, chart data mapping, CSV action.
- `shared/ui/` - reusable UI building blocks (`AppShell`, `Button`, `Card`, `InlineAlert`, `EmptyState`, `Skeleton`).
- `shared/api/` - typed API client, request helpers, and error normalization.
- `shared/types/` - frontend domain types and DTO mapping contracts.

Type safety requirement:

- `any` is disallowed across frontend source and tests.
- External or uncertain payloads should enter as `unknown` and be narrowed via type guards/parsers.

### 5.1 Reusable Core Components

- `AppShell` (header/nav/footer/layout frame)
- `StatusStrip` (system/sensor/queue pills)
- `MetricCard`
- `HistoricalFiltersForm`
- `ChartCard`
- `InlineAlert`
- `EmptyState`
- `SkeletonBlock` / `SkeletonText` / `SkeletonChart`

## 6) Data Flow and Behaviors

### 6.1 Shared Status (Home + Historical)

- Single shared status module/hook for both pages to avoid logic drift.
- Polls `/health` and `/queue`.
- Computes UI state (`ok`, `warn`, `error`) with consistent mapping.
- Preserves latest successful values during transient failures.
- Polling ownership is route-local per mounted page instance (no global singleton poller).

### 6.2 Home (`/`)

- Polls `/measurements` directly.
- Uses the shared status module/hook for `/health` and `/queue` (no duplicate status poller in Home).
- Updates metric cards and status strip without page reload.
- Keeps prior good values when a cycle fails.

### 6.3 Historical (`/historical`)

- Uses validated filters (`type`, `from`, `to`) to call `/data`.
- Transforms API output into Recharts series for min/avg/max across:
  - Temperature
  - Humidity
  - Pressure
- CSV export uses same filter set via `/data/export`.
- Empty response shows explicit empty state.
- API failure shows inline alert without clearing previously valid charts.

### 6.4 Template-Driven Values Removal

- Remove old template-provided technical-detail values from frontend UX.
- Remove backend code paths that were only supporting template interpolation for those values.
- Do not replace with a metadata endpoint.

## 7) Styling and Design Direction

- Tailwind utility-first, no frontend dependency on old `web/static/css/*.css` stylesheets.
- Preserve current product visual language (brand/nav/status/monitoring clarity) while componentizing.
- Responsive behavior maintained for desktop/tablet/mobile.
- Accessibility baseline preserved/improved (labels, focus visibility, semantic structure).

## 8) Loading, Error Handling, and Resilience

### 8.1 Skeleton Loading (Required)

- Show skeletons for not-yet-loaded async blocks:
  - Home status and metric cards
  - Historical chart cards
  - Route-level lazy load fallback (if code splitting used)
- Skeleton replacement is progressive by dependency completion (not full-screen blocking).

### 8.2 Request Error Policy

- Typed API helper handles timeout, non-2xx, invalid JSON, and network errors consistently.
- Shared status polling policy (used by both Home and Historical via shared status module/hook):
  - Base interval: 30s
  - Request timeout: 8s
  - One immediate retry per endpoint per cycle
  - After 3 consecutive failed cycles: back off to 60s + show degraded notice
  - On first successful cycle: return to 30s and clear degraded notice
- Home polling policy:
  - Base interval: 30s
  - Request timeout: 8s
  - One immediate retry per call cycle
  - After 3 consecutive failed cycles: back off to 60s + show degraded notice
  - On first successful cycle: return to 30s and clear degraded notice

## 9) Testing Strategy

Jest + React Testing Library with jsdom.

Critical-path coverage includes:

- Route rendering and nav active state (`/`, `/historical`, `*`)
- Shared status mapping logic (`ok/warn/error` behavior)
- Home metric cards with success/failure fixtures
- Historical filters validation and query serialization
- Chart container behavior with data vs empty vs error
- Skeleton lifecycle (visible while loading, replaced on completion)
- Empty/error state rendering

No full visual regression suite is required in this migration phase.

### 9.1 Backend Routing and Embedding Tests (Go)

Required backend coverage for migration-critical behavior:

- API routes are not intercepted by SPA fallback.
- Embedded frontend assets are served successfully.
- Non-API navigation routes return embedded SPA `index.html`.
- Missing asset-like paths return `404`.

## 10) Backend and Build Changes

### 10.1 Backend Adjustments

- Integrate embedded SPA static asset serving.
- Add SPA fallback handler for non-API routes.
- Remove page-template rendering path for index/historical/404 where superseded by SPA.
- Remove obsolete template-related data plumbing no longer used.

### 10.2 Build Chain

- Frontend bundling becomes part of app build chain.
- Production build path must include frontend bundle generation before Go binary compilation/embed stage.
- `make run` target added to:
  - bundle SPA for local development use,
  - run the Go app locally with that bundled frontend path.

## 11) Rollout Strategy

- Big-bang cutover in one release.
- Old template pages are replaced by SPA route handling.
- API endpoints remain backward-compatible for frontend consumption.

Cutover checklist:

- Legacy template handlers for `/`, `/historical`, and server-rendered 404 are removed from active runtime path.
- Legacy frontend template/static minification pipeline is removed from default build/run targets in the same release.
- Post-cutover smoke checks include `/`, `/historical`, unknown route, and key API endpoints.

## 12) Acceptance Criteria

- React 19 + TypeScript app exists in `./frontend` and builds successfully.
- HTML migrated to JSX/component composition with reusable components.
- Tailwind utility-first styling is used (without carrying old page CSS into SPA).
- Recharts powers historical visualizations.
- Critical Jest tests pass for selected component scope.
- Frontend TypeScript code and tests contain no `any` usage.
- Skeletons render for required async blocks before data availability.
- Skeletons are replaced progressively per block as data resolves.
- Go server serves embedded SPA assets from binary.
- Non-API routes correctly return SPA entry; API routes continue functioning.
- Unknown asset-like paths return `404` (not SPA fallback).
- Template-driven technical detail values and supporting backend code are removed.
- `make run` bundles SPA and starts the app locally.
- Backend tests verify API precedence, embedded asset serving, SPA fallback navigation, and missing-asset `404` behavior.
- Runtime proof confirms frontend assets are served from embedded bundle even when `frontend/dist` is unavailable at runtime.

## 13) Validation Commands (Post-Implementation)

- `npm --prefix frontend run test`
- `npm --prefix frontend run build`
- `go test ./...`
- `make test`
- `make run` (local integration smoke path)

Pass criteria:

- All commands above exit with code `0`.
- Jest reports no failing tests.
- Local smoke via `make run` serves SPA routes (`/`, `/historical`, unknown route -> SPA not-found view) while API endpoints remain reachable.
- Embedded runtime check: build and run binary with `frontend/dist` unavailable at runtime; verify `/` and frontend asset requests still succeed.
