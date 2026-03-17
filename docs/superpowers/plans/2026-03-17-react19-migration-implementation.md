# React 19 SPA Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace template/static frontend runtime with a React 19 + TypeScript SPA in `frontend`, served from assets embedded in the Go binary, while preserving existing backend APIs.

**Architecture:** Build a feature-sliced SPA (`/`, `/historical`, `*`) using Tailwind-only styling, Recharts, and shared typed API/status modules (no `any`). Integrate frontend bundling into build/run workflows, embed `frontend/dist` via `embed.FS`, and update Go routing to preserve API precedence while using SPA fallback for navigation.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS, Recharts, Jest + React Testing Library, Go `embed.FS`, Makefile

---

## File Map (planned changes)

- Create: `frontend/package.json` (frontend scripts and dependencies)
- Create: `frontend/tsconfig.json` (strict TS config; no implicit `any`)
- Create: `frontend/vite.config.ts` (bundler output to `frontend/dist`)
- Create: `frontend/jest.config.ts` and `frontend/jest.setup.ts` (test harness)
- Create: `frontend/tailwind.config.ts` and `frontend/postcss.config.js` (Tailwind setup)
- Create: `frontend/src/main.tsx`, `frontend/src/app/router.tsx`, `frontend/src/app/AppProviders.tsx`
- Create: `frontend/src/pages/HomePage.tsx`, `frontend/src/pages/HistoricalPage.tsx`, `frontend/src/pages/NotFoundPage.tsx`
- Create: `frontend/src/shared/types/*.ts` (API DTO and domain types)
- Create: `frontend/src/shared/api/client.ts` (typed fetch utilities using `unknown` + narrowing)
- Create: `frontend/src/shared/ui/*` (AppShell, Card, Button, Alert, EmptyState, Skeleton)
- Create: `frontend/src/features/status/*` (shared status polling hook + tests)
- Create: `frontend/src/features/current-metrics/*` (home metrics UI + tests)
- Create: `frontend/src/features/historical/*` (filters, chart mapping, CSV action + tests)
- Create: `web/frontend_assets.go` (embed frontend dist filesystem)
- Modify: `web/server.go` (route registration and SPA fallback wiring)
- Modify: `web/handlers.go` (remove template rendering paths and old template-data plumbing usage)
- Modify: `web/types.go` (remove template-only structures if now dead)
- Modify: `Makefile` (frontend build integration + `make run`)
- Modify: root `package.json` only if needed to avoid conflicts with frontend build scripts
- Test: `web/web_test.go` (SPA fallback/API precedence/embed serving tests)
- Test: `frontend/src/**/*.test.tsx` and `frontend/src/**/*.test.ts`

## Chunk 1: Frontend migration + backend embedding cutover

### Task 1: Bootstrap React 19 + TypeScript project in `frontend`

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`

- [ ] **Step 1: Write failing bootstrap verification (filesystem-level check)**

```bash
test -f frontend/package.json && test -f frontend/tsconfig.json && test -f frontend/vite.config.ts
```

Expected: command fails before files exist.

- [ ] **Step 2: Create minimal frontend package with strict scripts**

Include scripts (exact names):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "jest --runInBand",
    "test:watch": "jest --watch"
  }
}
```

- [ ] **Step 3: Configure strict TypeScript (`any` disallowed by policy)**

Set strict compiler options (at minimum):

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true
  }
}
```

- [ ] **Step 4: Configure bundler output**

Set Vite output directory to `dist` under `frontend`.

- [ ] **Step 5: Create minimal app bootstrap entry**

Create `frontend/src/main.tsx` with a minimal React render root to support next tasks.

- [ ] **Step 6: Verify bootstrap files exist and parse**

Run: `npm --prefix frontend run build`  
Expected: SUCCESS and generated `frontend/dist`.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/src/main.tsx
git commit -m "chore(frontend): bootstrap React 19 TypeScript workspace"
```

### Task 2: Add Tailwind-only styling pipeline

**Files:**
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/styles.css`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Write failing style entry verification**

Run: `test -f frontend/src/styles.css`  
Expected: FAIL before creation.

- [ ] **Step 2: Add Tailwind config scanning `frontend/src/**/*.{ts,tsx}`**

- [ ] **Step 3: Add PostCSS config for Tailwind + autoprefixer**

- [ ] **Step 4: Import `styles.css` in `frontend/src/main.tsx`**

- [ ] **Step 5: Verify utility classes are emitted in build output**

Run: `npm --prefix frontend run build`  
Expected: SUCCESS with generated CSS asset.

- [ ] **Step 6: Verify no legacy stylesheet carryover into SPA runtime**

Check that SPA pages/components do not import or reference `web/static/css/*.css`.

- [ ] **Step 7: Commit**

```bash
git add frontend/tailwind.config.ts frontend/postcss.config.js frontend/src/styles.css frontend/src/main.tsx
git commit -m "feat(frontend): configure Tailwind utility-first styling"
```

### Task 3: Add test harness (Jest + RTL)

**Files:**
- Create: `frontend/jest.config.ts`
- Create: `frontend/jest.setup.ts`
- Create: `frontend/src/app/router.test.tsx`

- [ ] **Step 1: Write initial failing test for route render smoke**

```tsx
test("router renders home route", () => {
  expect(true).toBe(false)
})
```

- [ ] **Step 2: Run test to confirm failure**

Run: `npm --prefix frontend run test -- router.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Configure Jest + jsdom + setup file**

- [ ] **Step 4: Replace placeholder with real router smoke test**

- [ ] **Step 5: Re-run test**

Run: `npm --prefix frontend run test -- router.test.tsx`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/jest.config.ts frontend/jest.setup.ts frontend/src/app/router.test.tsx
git commit -m "test(frontend): set up Jest and RTL harness"
```

### Task 4: Build app shell, routing, and page skeletons

**Files:**
- Create: `frontend/src/app/router.tsx`
- Create: `frontend/src/app/AppProviders.tsx`
- Create: `frontend/src/pages/HomePage.tsx`
- Create: `frontend/src/pages/HistoricalPage.tsx`
- Create: `frontend/src/pages/NotFoundPage.tsx`
- Create: `frontend/src/shared/ui/AppShell.tsx`
- Create: `frontend/src/shared/ui/Skeleton.tsx`

- [ ] **Step 1: Write failing route tests for `/`, `/historical`, and `*`, including nav active-state assertions**
- [ ] **Step 2: Implement `AppProviders`, router, and pages inside `AppShell`**
- [ ] **Step 3: Add route-level skeleton fallback (if lazy routes are used)**
- [ ] **Step 4: Verify route tests pass**

Run: `npm --prefix frontend run test -- router.test.tsx`  
Expected: PASS for all three route outcomes.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/router.tsx frontend/src/app/AppProviders.tsx frontend/src/pages frontend/src/shared/ui/AppShell.tsx frontend/src/shared/ui/Skeleton.tsx
git commit -m "feat(frontend): add SPA routes and shared app shell"
```

### Task 5: Implement typed API client and shared types (no `any`)

**Files:**
- Create: `frontend/src/shared/types/api.ts`
- Create: `frontend/src/shared/types/status.ts`
- Create: `frontend/src/shared/api/client.ts`
- Create: `frontend/src/shared/api/client.test.ts`

- [ ] **Step 1: Write failing tests for parse/error paths using `unknown` payloads**
- [ ] **Step 2: Implement typed parsers/guards without `any`**
- [ ] **Step 3: Implement unified error mapping (timeout, http, parse, network)**
- [ ] **Step 4: Run API client tests**

Run: `npm --prefix frontend run test -- client.test.ts`  
Expected: PASS with explicit typed assertions.

- [ ] **Step 5: Run no-`any` verification for frontend source and tests**

Run a deterministic check in `frontend/src` and test files to confirm no `: any`, `as any`, or generic `any` usage exists.
Expected: zero matches.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/types frontend/src/shared/api/client.ts frontend/src/shared/api/client.test.ts
git commit -m "feat(frontend): add typed API client with unknown-first parsing"
```

### Task 6: Implement shared status feature (Home + Historical)

**Files:**
- Create: `frontend/src/features/status/useStatusPolling.ts`
- Create: `frontend/src/features/status/StatusStrip.tsx`
- Create: `frontend/src/features/status/useStatusPolling.test.tsx`

- [ ] **Step 1: Write failing tests for status state mapping (`ok/warn/error`)**
- [ ] **Step 2: Add polling policy (30s base, 8s timeout, 1 retry, 60s backoff after 3 failures, recovery reset)**
- [ ] **Step 3: Implement status strip rendering + skeletons for initial load**
- [ ] **Step 4: Run status tests**

Run: `npm --prefix frontend run test -- useStatusPolling.test.tsx`  
Expected: PASS for mapping and backoff behaviors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/status
git commit -m "feat(frontend): share status polling and status strip between pages"
```

### Task 7: Implement Home metrics feature with skeleton/error states

**Files:**
- Create: `frontend/src/features/current-metrics/useCurrentMetrics.ts`
- Create: `frontend/src/features/current-metrics/MetricsGrid.tsx`
- Create: `frontend/src/features/current-metrics/current-metrics.test.tsx`
- Modify: `frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: Write failing tests for loading -> success -> error lifecycle, including skeleton visibility/replacement**
- [ ] **Step 2: Implement `/measurements` polling and metric cards with resilience policy (30s base, 8s timeout, 1 retry, 60s backoff after 3 failed cycles, recovery reset on first success)**
- [ ] **Step 3: Show skeleton before data and preserve last successful values on transient failure**
- [ ] **Step 4: Run Home feature tests**

Run: `npm --prefix frontend run test -- current-metrics.test.tsx`  
Expected: PASS.

Required assertions in Home tests:

- Degraded notice appears after 3 consecutive failed cycles.
- Polling interval shifts to 60s after threshold and returns to 30s on recovery.
- Last successful metric values are retained during transient errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/current-metrics frontend/src/pages/HomePage.tsx
git commit -m "feat(frontend): migrate home realtime metrics with resilient states"
```

### Task 8: Implement Historical filters + Recharts + CSV export

**Files:**
- Create: `frontend/src/features/historical/HistoricalFiltersForm.tsx`
- Create: `frontend/src/features/historical/HistoricalCharts.tsx`
- Create: `frontend/src/features/historical/useHistoricalData.ts`
- Create: `frontend/src/features/historical/historical.test.tsx`
- Modify: `frontend/src/pages/HistoricalPage.tsx`

- [ ] **Step 1: Write failing tests for query validation (`from <= to`) and serialization**
- [ ] **Step 2: Implement data load from `/data` and transform to Recharts datasets (min/avg/max)**
- [ ] **Step 3: Implement explicit empty state and inline error state without clearing prior valid charts**
- [ ] **Step 4: Wire CSV export to `/data/export` using same filter params**
- [ ] **Step 5: Add chart skeletons for initial/refresh loading states**
- [ ] **Step 6: Assert skeleton lifecycle in tests (visible while loading, replaced after data resolution)**
- [ ] **Step 7: Run historical tests**

Run: `npm --prefix frontend run test -- historical.test.tsx`  
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/historical frontend/src/pages/HistoricalPage.tsx
git commit -m "feat(frontend): migrate historical screen with Recharts and CSV flow"
```

### Task 8.1: Normalize shared UI componentization deliverables

**Files:**
- Create: `frontend/src/shared/ui/MetricCard.tsx`
- Create: `frontend/src/shared/ui/ChartCard.tsx`
- Create: `frontend/src/shared/ui/InlineAlert.tsx`
- Create: `frontend/src/shared/ui/EmptyState.tsx`
- Modify: `frontend/src/features/current-metrics/MetricsGrid.tsx`
- Modify: `frontend/src/features/historical/HistoricalCharts.tsx`
- Test: `frontend/src/shared/ui/shared-ui.test.tsx`

- [ ] **Step 1: Write failing tests proving reusable UI components render expected states/slots**
- [ ] **Step 2: Extract `MetricCard`, `ChartCard`, `InlineAlert`, and `EmptyState` into `shared/ui`**
- [ ] **Step 3: Update feature components to consume extracted shared components**
- [ ] **Step 4: Run shared UI tests and impacted feature tests**

Run: `npm --prefix frontend run test -- shared-ui.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/shared/ui frontend/src/features/current-metrics/MetricsGrid.tsx frontend/src/features/historical/HistoricalCharts.tsx
git commit -m "refactor(frontend): extract reusable shared UI components"
```

### Task 9: Remove template-driven technical details and dead frontend template plumbing

**Files:**
- Modify: `frontend/src/pages/HomePage.tsx`
- Modify: `web/server.go`
- Modify: `web/handlers.go`
- Modify: `web/types.go`
- Test: `web/web_test.go`

- [ ] **Step 1: Write failing backend test asserting removed template-data path is not required for `/` rendering path**
- [ ] **Step 2: Remove old technical-details UI and related data dependencies from SPA code**
- [ ] **Step 3: Remove backend route-description/template-data plumbing that existed only for template interpolation**
- [ ] **Step 4: Run Go tests for `web` package**

Run: `go test ./web -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/HomePage.tsx web/server.go web/handlers.go web/types.go web/web_test.go
git commit -m "refactor(web): remove template-injected technical details plumbing"
```

### Task 10: Embed frontend bundle and wire SPA fallback in Go server

**Files:**
- Create: `web/frontend_assets.go`
- Modify: `web/server.go`
- Modify: `web/handlers.go`
- Test: `web/web_test.go`

- [ ] **Step 1: Write failing Go tests for routing behavior**

Test cases to add:

- API handlers are never intercepted by SPA fallback.
- Existing embedded frontend assets are served successfully.
- Non-API navigation routes return embedded `index.html`.
- Unknown extension paths and unknown `/assets/*` return `404`.

- [ ] **Step 2: Implement embedded frontend filesystem using `embed.FS` over `frontend/dist/**`**
- [ ] **Step 3: Implement routing order and fallback predicate per spec**
- [ ] **Step 4: Run web tests**

Run: `go test ./web -v`  
Expected: PASS for all new routing/embed cases.

- [ ] **Step 5: Commit**

```bash
git add web/frontend_assets.go web/server.go web/handlers.go web/web_test.go
git commit -m "feat(web): serve embedded SPA bundle with API-safe fallback routing"
```

### Task 11: Integrate build chain and add `make run`

**Files:**
- Modify: `Makefile`
- Optionally modify: root `package.json` (only if needed for orchestration)

- [ ] **Step 1: Write failing command check for `make run` target**

Run: `make help`  
Expected: before change, `run` target absent.

- [ ] **Step 2: Add Make targets to build frontend before app build where required**
- [ ] **Step 3: Add `make run` to build/bundle SPA and run Go app locally**
- [ ] **Step 4: Remove legacy template/static minification from default build/run path**
- [ ] **Step 5: Verify make behavior**

Run: `make run`  
Expected: frontend bundle completes and app starts serving SPA + APIs.

- [ ] **Step 6: Commit**

```bash
git add Makefile
git commit -m "build: add frontend bundle integration and make run target"
```

### Task 12: Final validation and cutover checks

**Files:**
- Modify: test files only if validation reveals deterministic failures.

- [ ] **Step 1: Run frontend tests**

Run: `npm --prefix frontend run test`  
Expected: PASS (no failing tests).

- [ ] **Step 2: Run frontend build**

Run: `npm --prefix frontend run build`  
Expected: PASS (`frontend/dist` produced).

- [ ] **Step 3: Run backend test suites**

Run: `go test ./...`  
Expected: PASS.

- [ ] **Step 4: Run project test target**

Run: `make test`  
Expected: PASS.

- [ ] **Step 5: Embedded runtime proof**

Procedure:

1. Build binary with embedded frontend bundle.
2. Temporarily move or remove runtime `frontend/dist` directory.
3. Run binary and verify `/` and frontend asset paths still work.

Expected: app serves SPA and assets from embedded bundle even without runtime dist directory.

- [ ] **Step 6: Manual smoke matrix**

Verify:

- `/` loads Home SPA
- `/historical` loads Historical SPA
- unknown route loads SPA not-found view
- `/measurements`, `/health`, `/queue`, `/data`, `/data/export` still behave as APIs

- [ ] **Step 7: Final commit**

```bash
git add frontend web Makefile package.json
git commit -m "feat: cut over to embedded React SPA frontend"
```
