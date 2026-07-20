---
name: new-problem
description: Use when adding a new SQL practice problem to this repo (packages/problems). Scaffolds the JSON + test file and walks through every other file that must be touched for the problem to actually show up and for tests to stay green.
---

Adding a problem touches more files than it looks like. `apps/api`'s `loadProblems.ts` scans the `packages/problems/<category>/` directories dynamically, but `packages/problems/index.ts` (what the **web app** imports) is a **hand-maintained list** — a JSON file alone will show up via the API but not in the web UI until it's added there too.

## Steps

1. **Pick category + file number.** Category is one of `where`, `orderby`, `groupby`, `join` (lowercase directory name; uppercase in the JSON's `category` field, e.g. `"WHERE"`). File name is the next zero-padded sequence number in that category directory, e.g. `packages/problems/where/004.json`.

2. **Pick the next global `id`.** IDs are sequential across all problems, not per-category. Check `packages/problems/index.ts` or run:
   ```
   node -e "console.log(require('./packages/problems/index.ts'))" # or just read the array
   ```
   or simpler: open `packages/problems/index.test.ts` and take `max(existing ids) + 1`.

3. **Write `packages/problems/<category>/NNN.json`** matching `packages/shared/src/types.ts`'s `Problem` shape:
   - `schema`: array of literal `"CREATE TABLE name(col TYPE, col TYPE, ...);"` strings — one entry per table. For JOIN problems this is 2+ entries (see `packages/problems/join/001.json` for the pattern, including PK-style `id` and FK-style `*_id` column naming, which the web UI's SCHEMA panel color-codes).
   - `seed`: array of `"INSERT INTO ... VALUES(...);"` strings.
   - `expectedResult`: array of row objects — keys are the exact column names/aliases the correct query should produce.
   - `hint`: array of one or two short hint strings.
   - `orderMatters`: `true` only if row order is part of what's being tested (e.g. ORDER BY problems).

4. **Write `packages/problems/<category>/NNN.test.ts`** — copy the shape of a sibling test in the same category (reads the JSON, calls `parseProblem`, asserts `id` and `category`).

5. **Register it in `packages/problems/index.ts`**: add the import and add it to the exported `problems` array. Skipping this step means the API returns the problem but the web app never shows it.

6. **Update `packages/problems/index.test.ts`**: bump the `toHaveLength(N)` count, extend the sorted-ids assertion, and add/extend an `it(...)` block asserting the new id/category.

7. **Update `apps/api/src/problems/loadProblems.test.ts`**: it independently hardcodes `toHaveLength(N)` — bump it too.

8. **Update the problem count in `README.md`** (currently stated as "全9問" / category breakdown).

9. Run `pnpm test` and `pnpm test:e2e` — both must stay green.

If this is real feature work (not a quick scratch addition), follow CLAUDE.md's spec → plan → TDD pipeline rather than skipping straight to the JSON file.
