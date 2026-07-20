# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow: spec, then plan, then TDD

Every feature (not just large ones) is expected to go through this pipeline before code changes land — this is how essentially all prior work in this repo was done, and it's the convention to keep following:

1. **Design spec** — `superpowers:brainstorming`, written to `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md`.
2. **Implementation plan** — `superpowers:writing-plans`, written to `docs/superpowers/plans/YYYY-MM-DD-<slug>.md`.
3. **Implementation** — `superpowers:executing-plans` or `superpowers:subagent-driven-development`, following `superpowers:test-driven-development` (failing test first, then minimal code).

Look at existing files in `docs/superpowers/specs/` and `docs/superpowers/plans/` for the expected shape/tone before writing new ones.

## Commits

- Commit directly to `main` — this repo has no feature-branch or PR workflow (no branches besides `main`, no PRs have ever been opened).
- Messages follow Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`), optionally scoped, e.g. `feat(web): ...`. Design-doc-only commits use `docs: add design spec for ...` / `docs: add implementation plan for ...`.

## Testing conventions

- Test files must be named `*.test.ts` — **not** `.test.tsx`. `vitest.config.ts`'s `include` glob only matches `.test.ts`; a `.test.tsx` file is silently skipped.
- There is no component-level React testing (no Testing Library, no jsdom/happy-dom configured). Business logic lives in pure, framework-free functions (e.g. `apps/web/src/xp`, `apps/web/src/terminal/lineBuffer.ts`, `apps/web/src/schema/parseSchema.ts`) that get unit-tested directly. UI/DOM behavior is covered by Playwright specs in `e2e/`, not component tests.
- Run a single vitest file with `npx vitest run <path>`; the root `pnpm test` runs everything under `{apps,packages}/*/**/*.test.ts`.

## Architecture notes

- **Terminal input is a pure reducer.** `apps/web/src/terminal/lineBuffer.ts` (`toLineBufferEvent` + `reduceLineBuffer`) owns all line-editing behavior (printable chars, paste, backspace, enter, history navigation) as pure, unit-tested functions. `TerminalView.tsx` just wires xterm.js's `onData` to this reducer and keeps ephemeral state (buffer, history array, draft) in closure variables, not React state. New input behaviors belong in `lineBuffer.ts`, not bolted onto `TerminalView`'s `onData` callback.
- **`Problem.schema` is raw DDL, not structured data.** Each problem's `schema` field is an array of literal `CREATE TABLE ...;` strings (see `packages/shared/src/types.ts`). The SCHEMA panel parses these on the fly via `apps/web/src/schema/parseSchema.ts` rather than the data having a separate structured column list — keep it that way rather than adding a parallel structured schema field.
- **localStorage is a single source of truth, not a cache.** Completed-problem IDs (`sql-practice:completed-problems`) are the only persisted fact; XP and level are always derived from it via `apps/web/src/xp/index.ts` (`totalXp`/`calculateLevel`), never stored directly, to avoid double-counting or drift. Follow the same pattern for any new persisted state.
- Adding a new problem is adding a `packages/problems/<category>/NNN.json` + matching `NNN.test.ts` — see the `new-problem` skill.

## Verifying UI changes

There's no CI configured — `pnpm lint`, `pnpm test`, and `pnpm test:e2e` must be run locally. For visual changes, don't stop at the automated suite: see the `verify-web-ui` skill for the browser-check recipe used throughout this project (standalone dev server + Playwright MCP screenshots in light/dark and mobile widths).

Commands and repo layout are documented in @README.md — read it instead of duplicating here.
