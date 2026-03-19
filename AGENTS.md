# AGENTS.md

This file is guidance for coding agents working in this repository.
It is based on the current Go, Makefile, npm, and lint configuration.

## Project Snapshot

- Primary language: backend Go (`go 1.25.0` in `go.mod`) frontend TypeScript + React 19.
- Entry point: `main.go`.
- Main packages: `bme280`, `config`, `queue`, `repository`, `web`, `weather`.
- Build orchestration: `Makefile`.
- Template minification tooling: npm scripts in `package.json`.
- Go lint config: `.golangci.yml`.
- Frontend packages are managed with `npm` 

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
- `make info` - print build metadata.
- `make package-rpi` - build and package for Raspberry Pi deployment.
- `make run` - run the app locally

## Architecture And Code Organization

- Keep packages focused by responsibility:
  - `config`: loading defaults and YAML config.
  - `queue`: generic queue, retry policy, circuit breaker.
  - `repository`: SQLite persistence and retrieval.
  - `web`: HTTP server, handlers, responses.
  - `bme280`: hardware and simulated sensor interactions.
- Prefer extending existing package boundaries over adding cross-cutting helpers in `main`.
- Keep `main.go` as orchestration and wiring, not business logic.

## Fixes and refactors

- Must use skill `no-workarounds` when planning a solution

## Go Development Guidelines

- Should use skill `golang-patterns`

## Types And API Design

- Prefer concrete types for internal logic and interfaces at boundaries.
- Follow existing interface-driven patterns (`Reader`, `Worker`, repository interfaces).
- Pass `context.Context` as the first parameter for context-aware operations.
- Use typed config structs rather than untyped maps.

## Error Handling Guidelines

- Return errors instead of panicking, except for unrecoverable programmer/configuration issues already following repo patterns.
- Wrap errors with context using `%w`:
  - `fmt.Errorf("failed to load config: %w", err)`
- Use sentinel errors for shared conditions (as in `queue/errors.go`).
- Use retryable error semantics when interacting with queue retry flow.
- Log operational errors with useful context, but avoid leaking secrets.
- Validate required configuration early at startup.


## Testing Guidelines

- Keep tests table-driven when testing multiple input/output scenarios.
- Use small mocks/fakes as done in `web/web_test.go`.
- Cover success, error, and method/validation edge cases.
- For concurrency-sensitive code, run `go test -race ./...` before finishing larger changes.
- Add benchmarks only for code paths where performance is relevant.

## Frontend development
- `./frontend` contains the react frontend code.
- Should use skills `frontend-design` `ui-uix-pro-max` and `web-design-guidelines`
- Should use component composition. Use skill `vercel-composition-patterns`
- Should use skill `vercel-react-best-practices` for React coding
- Must use shadcn components over coding local component when available. Use skill `shadcn-ui` and `shadcn`

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

## Notes For Future Agents

- If command behavior differs from this file, trust actual repo files (`Makefile`, `go.mod`, `package.json`, `.golangci.yml`) and update `AGENTS.md`.
- Keep this file current when tooling, linters, or workflows change.
