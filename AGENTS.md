# AGENTS.md

This file is guidance for coding agents working in this repository.
It is based on the current Go, Makefile, npm, and lint configuration.

## Project Snapshot

- Primary language: Go (`go 1.25.0` in `go.mod`).
- Entry point: `main.go`.
- Main packages: `bme280`, `config`, `queue`, `repository`, `web`, `weather`.
- Build orchestration: `Makefile`.
- Template minification tooling: npm scripts in `package.json`.
- Go lint config: `.golangci.yml`.

## Environment And Setup

- From repo root, install Go dependencies:
  - `go mod download`
- For template minification/watch features, install npm deps:
  - `npm install`
- For full linting, ensure `golangci-lint` is installed locally.

## Build Commands

- Preferred local development build:
  - `make build`
- Production build with minified templates:
  - `make build-prod`
- Raspberry Pi ARM64 build:
  - `make build-rpi`
- Direct Go build (without Makefile workflow):
  - `go build .`

## Lint And Format Commands

- Format code (repo standard):
  - `make fmt`
  - This runs `go fmt ./...`.
- Lint using configured linters:
  - `golangci-lint run`
- Current enabled linters from `.golangci.yml` include:
  - `gofmt`, `goimports`, `misspell`, `gosimple`, `copyloopvar`, `nilerr`, `unconvert`, `unparam`, `prealloc`, `perfsprint`.

## Test Commands

- Run full test suite (preferred):
  - `make test`
  - Equivalent core command: `go test -v ./...`
- Run all tests without verbose output:
  - `go test ./...`
- Run race detector:
  - `go test -race ./...`
- Run coverage quickly:
  - `go test -cover ./...`

## Running A Single Test (Important)

- Single test function in one package:
  - `go test -v ./web -run '^TestHandleMeasurements_Success$'`
- Single test function across repo (less efficient, but useful):
  - `go test -v ./... -run '^TestQueueWhatever$'`
- Multiple tests by regex pattern:
  - `go test -v ./queue -run 'TestHandle|TestRetry'`
- Run one benchmark:
  - `go test -bench '^BenchmarkHandleMeasurements$' ./web`
- If you need deterministic single-test execution, anchor regex with `^...$`.

## Useful Make Targets

- `make help` - list available targets.
- `make clean` - remove build artifacts.
- `make clean-templates` - remove minified template output.
- `make watch-templates` - watch and minify templates on changes.
- `make info` - print build metadata.
- `make package-rpi` - build and package for Raspberry Pi deployment.

## npm Commands (Template Pipeline)

- `npm run minify` - minify HTML templates into `web/templates-min`.
- `npm run clean` - remove `web/templates-min`.
- `npm run watch` - watch template files and auto-minify.

## Architecture And Code Organization

- Keep packages focused by responsibility:
  - `config`: loading defaults and YAML config.
  - `queue`: generic queue, retry policy, circuit breaker.
  - `repository`: SQLite persistence and retrieval.
  - `web`: HTTP server, handlers, responses.
  - `bme280`: hardware and simulated sensor interactions.
- Prefer extending existing package boundaries over adding cross-cutting helpers in `main`.
- Keep `main.go` as orchestration and wiring, not business logic.
- `./frontend` contains the react frontend code.

## Go Style Guidelines

- Always rely on `gofmt` formatting.
- Keep imports grouped in standard Go order:
  - standard library
  - blank line
  - module imports
- Let `goimports` manage import cleanup and ordering where possible.
- Use tabs as Go tools produce; do not hand-align with spaces.
- Keep exported names in PascalCase and unexported names in camelCase.
- Package names should be short, lowercase, no underscores.
- File names should be lowercase; use `_test.go` for tests.
- Should use stdlib functions over custom implementations.

## Types And API Design

- Prefer concrete types for internal logic and interfaces at boundaries.
- Follow existing interface-driven patterns (`Reader`, `Worker`, repository interfaces).
- Keep interfaces small and behavior-focused.
- Pass `context.Context` as the first parameter for context-aware operations.
- Use typed config structs rather than untyped maps.
- Keep zero-value behavior sensible where practical.

## Frontend development
- Should rely on skills `frontend-design` `ui-uix-pro-max` and `web-design-guidelines` when designing
- Should use component composition. Use skill `vercel-composition-patterns`
- Should use skill `vercel-react-best-practices` for React issues
- Prefer shadcn components instead of coding local component when available. Use skill `shadcn`

## Error Handling Guidelines

- Return errors instead of panicking, except for unrecoverable programmer/configuration issues already following repo patterns.
- Wrap errors with context using `%w`:
  - `fmt.Errorf("failed to load config: %w", err)`
- Use sentinel errors for shared conditions (as in `queue/errors.go`).
- Use retryable error semantics when interacting with queue retry flow.
- Log operational errors with useful context, but avoid leaking secrets.
- Validate required configuration early at startup.

## Concurrency Guidelines

- Respect existing cancellation and shutdown flow using contexts.
- Check `ctx.Done()` in long-running loops/select blocks.
- Avoid goroutine leaks: ensure exits on cancellation.
- Prefer channel operations with `select` when blocking could hang shutdown.
- Be careful with shared maps/slices; copy defensively when returning maps (pattern exists in `web/server.go`).

## Testing Guidelines

- Keep tests table-driven when testing multiple input/output scenarios.
- Use small mocks/fakes as done in `web/web_test.go`.
- Cover success, error, and method/validation edge cases.
- For concurrency-sensitive code, run `go test -race ./...` before finishing larger changes.
- Add benchmarks only for code paths where performance is relevant.

## Configuration And Runtime

- Config is loaded through `config.Load(...)` with defaults fallback.
- Preserve current config file discovery behavior unless intentionally changing it.
- Do not hardcode secrets.
- Keep defaults conservative and production-safe.

## Agent Workflow Recommendations

- Before editing, scan nearby files for local conventions.
- After edits, run at minimum:
  - `go test ./...`
- For broader changes, run:
  - `make fmt`
  - `golangci-lint run`
  - `go test -race ./...`
- Prefer minimal, focused patches over broad refactors.
- Update docs/tests when behavior changes.

## Cursor And Copilot Rules

- `.cursorrules`: not found in this repository.
- `.cursor/rules/`: not found in this repository.
- `.github/copilot-instructions.md`: not found in this repository.
- If these files are added later, treat them as higher-priority agent instructions and merge their requirements into this document.

## Notes For Future Agents

- If command behavior differs from this file, trust actual repo files (`Makefile`, `go.mod`, `package.json`, `.golangci.yml`) and update `AGENTS.md`.
- Keep this file current when tooling, linters, or workflows change.
