# judgeのApp.tsx組み込み Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既に実装済みの `judge()` を `apps/web` の画面に組み込み、問題001の内容でDBをシードし、SQL実行後に正解/不正解を表示する。

**Architecture:** `packages/problems` に検証済み `Problem[]` をexportするエントリポイントを新設し、`apps/web` から静的importで利用する（ネットワーク呼び出し・`apps/api`連携は行わない）。`App.tsx` は固定`SEED_SQL`を問題データに置き換え、クエリ実行成功後に`judge()`を呼んで判定結果を画面に表示する。

**Tech Stack:** TypeScript, React, Vite（既存構成のまま。新規依存パッケージなし、ワークスペース内パッケージの依存追加のみ）

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-07-19-judge-ui-integration-design.md`（承認済み）
- `packages/problems/index.ts` は `Problem[]` を `problems` という名前でexportする。中身は `packages/shared` の `parseProblem` で検証済みであること
- `apps/web` は `apps/api` に一切依存しない（HTTPリクエストを行わない）。問題データは静的importで取得する
- `App.tsx` の判定結果表示には `data-testid="judge-result"` を付与する
- テスト: 新しいReactコンポーネント単体テストは追加しない。`e2e/sql-execution.spec.ts`（Playwright）で画面の動作を検証する
- 対象外（本計画では実装しない）: 複数問題の選択・一覧UI、`apps/api`との連携、レビュー生成ロジック、XP・レベルシステム

---

### Task 1: packages/problems — エントリポイントの追加

**Files:**
- Create: `packages/problems/index.ts`
- Test: `packages/problems/index.test.ts`
- Modify: `packages/problems/package.json`

**Interfaces:**
- Consumes: `parseProblem`（`@sql-practice/shared`、既存）、`where/001.json`（既存データ）
- Produces: `export const problems: Problem[]`（Task 2の`apps/web`が使用）

- [ ] **Step 1: 失敗するテストを書く — `packages/problems/index.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { problems } from "./index";

describe("problems", () => {
  it("includes the seeded WHERE problem", () => {
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ id: 1, category: "WHERE" });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `pnpm --filter @sql-practice/problems test`
Expected: FAIL — `Cannot find module './index'`

- [ ] **Step 3: `packages/problems/index.ts` を実装する**

```ts
import { parseProblem, type Problem } from "@sql-practice/shared";
import where001 from "./where/001.json";

export const problems: Problem[] = [where001].map(parseProblem);
```

- [ ] **Step 4: `packages/problems/package.json` に `exports` を追加する**

現在のファイル全体を以下に置き換える:

```json
{
  "name": "@sql-practice/problems",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.ts"
  },
  "dependencies": {
    "@sql-practice/shared": "workspace:*"
  }
}
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `pnpm --filter @sql-practice/problems test`
Expected: PASS

- [ ] **Step 6: リポジトリ全体のテストが通ることを確認する**

Run: `pnpm test`
Expected: PASS（全テストファイル）

- [ ] **Step 7: コミットする**

```bash
git add packages/problems
git commit -m "feat: export validated problem list from packages/problems"
```

---

### Task 2: apps/web — App.tsxにjudgeを組み込み、E2Eテストを拡張

**Files:**
- Modify: `apps/web/package.json`（`@sql-practice/problems` を依存に追加）
- Modify: `apps/web/src/App.tsx`
- Modify: `e2e/sql-execution.spec.ts`

**Interfaces:**
- Consumes: `problems`（Task 1、`@sql-practice/problems`）、`judge`（既存、`apps/web/src/judge`）、`TableResult`（既存）
- Produces: なし（画面のふるまいがこのタスクのゴール）

- [ ] **Step 1: `apps/web` に `@sql-practice/problems` を依存として追加する**

`apps/web/package.json` の `"dependencies"` に以下を追加する（アルファベット順、`"@electric-sql/pglite"` の直後）:

```json
    "@sql-practice/problems": "workspace:*",
```

追加後、`apps/web/package.json` の `dependencies` ブロック全体は以下になる:

```json
  "dependencies": {
    "@electric-sql/pglite": "0.5.4",
    "@sql-practice/problems": "workspace:*",
    "@sql-practice/shared": "workspace:*",
    "@xterm/addon-fit": "0.11.0",
    "@xterm/xterm": "6.0.0",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
```

- [ ] **Step 2: 依存関係をインストールする**

```bash
pnpm install
```

- [ ] **Step 3: `apps/web/src/App.tsx` を書き換える**

現在のファイル全体を以下に置き換える:

```tsx
import { useCallback, useEffect, useState } from "react";
import type { PGlite } from "@electric-sql/pglite";
import { problems } from "@sql-practice/problems";
import { createDb, runQuery } from "./db/pglite";
import type { TableResult } from "./db/queryResult";
import { judge } from "./judge";
import { TerminalView } from "./terminal/TerminalView";

const problem = problems[0];

function App() {
  const [db, setDb] = useState<PGlite | null>(null);
  const [result, setResult] = useState<TableResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createDb().then(async (instance) => {
      for (const statement of [...problem.schema, ...problem.seed]) {
        await instance.exec(statement);
      }
      if (!cancelled) setDb(instance);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = useCallback(
    async (sql: string) => {
      if (!db || sql.trim() === "") return;
      try {
        setError(null);
        const tableResult = await runQuery(db, sql);
        setResult(tableResult);
        setCorrect(judge(tableResult, problem));
      } catch (err) {
        setResult(null);
        setCorrect(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [db],
  );

  return (
    <main>
      <h1>SQL Practice</h1>
      <p>{problem.question}</p>
      {db ? <TerminalView onSubmit={handleSubmit} /> : <p>データベースを初期化しています…</p>}
      {error && <p role="alert">{error}</p>}
      {correct !== null && (
        <p data-testid="judge-result">
          {correct ? "○ 正解です！" : "× 不正解です。もう一度考えてみましょう"}
        </p>
      )}
      {result && (
        <table data-testid="result-table">
          <thead>
            <tr>
              {result.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default App;
```

- [ ] **Step 4: `e2e/sql-execution.spec.ts` を拡張する**

現在のファイル全体を以下に置き換える（既存テストの末尾に○表示チェックを追加し、不正解ケースのテストを新規追加する）:

```ts
import { expect, test } from "@playwright/test";

test("executes a SELECT query and shows matching rows", async ({ page }) => {
  await page.goto("/");

  const terminal = page.locator(".xterm-helper-textarea");
  await terminal.click();
  await page.keyboard.type("SELECT id, name, age FROM users WHERE age >= 20;");
  await page.keyboard.press("Enter");

  const table = page.getByTestId("result-table");
  await expect(table).toBeVisible();
  await expect(table).toContainText("Alice");
  await expect(table).toContainText("Carol");
  await expect(table).not.toContainText("Bob");

  const verdict = page.getByTestId("judge-result");
  await expect(verdict).toContainText("○");
});

test("shows an incorrect verdict for a query that doesn't match the expected result", async ({ page }) => {
  await page.goto("/");

  const terminal = page.locator(".xterm-helper-textarea");
  await terminal.click();
  await page.keyboard.type("SELECT id, name, age FROM users;");
  await page.keyboard.press("Enter");

  const table = page.getByTestId("result-table");
  await expect(table).toBeVisible();

  const verdict = page.getByTestId("judge-result");
  await expect(verdict).toContainText("×");
});
```

- [ ] **Step 5: ユニットテスト・ビルドが通ることを確認する**

```bash
pnpm test
pnpm build
```

Expected: 両方成功

- [ ] **Step 6: E2Eテストが通ることを確認する**

```bash
pnpm test:e2e
```

Expected: `2 passed`

- [ ] **Step 7: コミットする**

```bash
git add apps/web e2e pnpm-lock.yaml
git commit -m "feat: wire judge into App.tsx and show correct/incorrect verdict"
```

---
