# ルールベースレビュー生成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 不正解時に、実行結果と期待結果の差分をルールベースで分析し、具体的なフィードバック文を画面に表示する。

**Architecture:** `judge`（既存）が使う行の正規化処理（`canonicalRow`）を共有ヘルパーとして切り出し、`judge`・`review`双方から利用する。`review/index.ts` に `generateReview()` を実装し、`App.tsx` で不正解時のみ呼び出して表示する。

**Tech Stack:** TypeScript, React, Vitest, Playwright（既存構成のまま。新規依存パッケージなし）

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-07-19-review-generation-design.md`（承認済み）
- `judge(actual, problem): boolean` の公開シグネチャ・挙動は一切変更しない
- `generateReview(actual: TableResult, problem: Problem): string` は純粋関数。副作用なし
- レビュー文は不正解時のみ生成・表示する（正解時・未実行時は表示しない）
- 差分カテゴリの判定優先順位: A) 列数不一致 → B) 順序のみ違う（`orderMatters: true`時） → C) 余分な行のみ → D) 不足行のみ → E) それ以外
- `App.tsx` の判定結果表示には既存の `data-testid="judge-result"` を、レビュー文には `data-testid="review"` を付与する
- 対象外（本計画では実装しない）: 正解時のフィードバック、SQLテキストのパターン解析、複数メッセージの同時表示、複数問題選択UI、XP・レベルシステム

---

### Task 1: apps/web/src/judge, review — canonicalRowの共有化とgenerateReview()の実装

**Files:**
- Create: `apps/web/src/judge/canonicalRow.ts`
- Modify: `apps/web/src/judge/index.ts`（`canonicalRow`を切り出し先からimportする）
- Create: `apps/web/src/review/index.ts`
- Test: `apps/web/src/review/index.test.ts`

**Interfaces:**
- Consumes: `Problem`型（`@sql-practice/shared`、既存）、`TableResult`型（既存、`apps/web/src/db/queryResult.ts`）
- Produces: `export function canonicalRow(values: unknown[]): string`（`apps/web/src/judge/canonicalRow.ts`）、`export function generateReview(actual: TableResult, problem: Problem): string`（`apps/web/src/review/index.ts`、Task 2の`App.tsx`が使用）

- [ ] **Step 1: 既存の `judge` テストが通ることを確認する（リファクタ前のベースライン）**

Run: `pnpm test`
Expected: PASS（全テストファイル。リファクタ後も同じ結果になることを確認するための基準）

- [ ] **Step 2: `apps/web/src/judge/canonicalRow.ts` を作成する**

```ts
export function canonicalRow(values: unknown[]): string {
  return values
    .map((v) => JSON.stringify(v))
    .sort()
    .join(" ");
}
```

- [ ] **Step 3: `apps/web/src/judge/index.ts` を書き換え、`canonicalRow` を新ファイルからimportする**

現在のファイル全体を以下に置き換える（ロジックは変更しない。`canonicalRow`のローカル定義を削除し、importに置き換えるのみ）:

```ts
import type { Problem } from "@sql-practice/shared";
import type { TableResult } from "../db/queryResult";
import { canonicalRow } from "./canonicalRow";

function multisetEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, i) => value === sortedB[i]);
}

export function judge(actual: TableResult, problem: Problem): boolean {
  const actualRows = actual.rows.map(canonicalRow);
  const expectedRows = problem.expectedResult.map((row) => canonicalRow(Object.values(row)));

  if (problem.orderMatters) {
    return (
      actualRows.length === expectedRows.length &&
      actualRows.every((row, i) => row === expectedRows[i])
    );
  }

  return multisetEqual(actualRows, expectedRows);
}
```

- [ ] **Step 4: リファクタ後も `judge` の既存テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS（Step 1と同じ結果。`apps/web/src/judge/index.test.ts` の29ケースがすべて変更なしで通ることを確認する — 動作が変わっていないことの証明）

- [ ] **Step 5: 失敗するテストを書く — `apps/web/src/review/index.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import type { Problem } from "@sql-practice/shared";
import type { TableResult } from "../db/queryResult";
import { generateReview } from "./index";

function makeProblem(overrides: Partial<Problem>): Problem {
  return {
    id: 1,
    title: "test",
    difficulty: 1,
    category: "WHERE",
    question: "test",
    schema: [],
    seed: [],
    expectedResult: [],
    hint: [],
    orderMatters: false,
    ...overrides,
  };
}

describe("generateReview", () => {
  it("returns the column-count message when actual has a different number of columns", () => {
    const actual: TableResult = {
      columns: ["id", "name"],
      rows: [[1, "Alice"]],
    };
    const problem = makeProblem({
      expectedResult: [{ id: 1, name: "Alice", age: 22 }],
      orderMatters: false,
    });

    expect(generateReview(actual, problem)).toBe("SELECTする列の数を確認しましょう");
  });

  it("returns the ORDER BY message when values match but order is wrong", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [
        [3, "Carol", 35],
        [1, "Alice", 22],
      ],
    };
    const problem = makeProblem({
      expectedResult: [
        { id: 1, name: "Alice", age: 22 },
        { id: 3, name: "Carol", age: 35 },
      ],
      orderMatters: true,
    });

    expect(generateReview(actual, problem)).toBe("ORDER BYを確認しましょう");
  });

  it("returns the too-many-rows message when there are extra rows", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [
        [1, "Alice", 22],
        [3, "Carol", 35],
        [2, "Bob", 18],
      ],
    };
    const problem = makeProblem({
      expectedResult: [
        { id: 1, name: "Alice", age: 22 },
        { id: 3, name: "Carol", age: 35 },
      ],
      orderMatters: false,
    });

    expect(generateReview(actual, problem)).toBe(
      "抽出条件が緩すぎるかもしれません。WHERE句の条件を見直しましょう",
    );
  });

  it("returns the too-few-rows message when a row is missing", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [[1, "Alice", 22]],
    };
    const problem = makeProblem({
      expectedResult: [
        { id: 1, name: "Alice", age: 22 },
        { id: 3, name: "Carol", age: 35 },
      ],
      orderMatters: false,
    });

    expect(generateReview(actual, problem)).toBe(
      "抽出条件が厳しすぎるかもしれません。比較演算子や条件を見直しましょう",
    );
  });

  it("returns the generic values message when a value differs", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [[1, "Alice", 23]],
    };
    const problem = makeProblem({
      expectedResult: [{ id: 1, name: "Alice", age: 22 }],
      orderMatters: false,
    });

    expect(generateReview(actual, problem)).toBe("結果の値を見直しましょう");
  });

  it("returns the generic values message when both extra and missing rows exist", () => {
    const actual: TableResult = {
      columns: ["id", "name", "age"],
      rows: [
        [1, "Alice", 22],
        [2, "Bob", 18],
      ],
    };
    const problem = makeProblem({
      expectedResult: [
        { id: 1, name: "Alice", age: 22 },
        { id: 3, name: "Carol", age: 35 },
      ],
      orderMatters: false,
    });

    expect(generateReview(actual, problem)).toBe("結果の値を見直しましょう");
  });
});
```

- [ ] **Step 6: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — `apps/web/src/review/index.test.ts` が `Cannot find export 'generateReview'` 等で失敗する

- [ ] **Step 7: `apps/web/src/review/index.ts` を実装する**

```ts
import type { Problem } from "@sql-practice/shared";
import type { TableResult } from "../db/queryResult";
import { canonicalRow } from "../judge/canonicalRow";

function countBy(rows: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row, (counts.get(row) ?? 0) + 1);
  }
  return counts;
}

function multisetDiff(actual: string[], expected: string[]): { extra: number; missing: number } {
  const actualCounts = countBy(actual);
  const expectedCounts = countBy(expected);
  const keys = new Set([...actualCounts.keys(), ...expectedCounts.keys()]);

  let extra = 0;
  let missing = 0;
  for (const key of keys) {
    const a = actualCounts.get(key) ?? 0;
    const e = expectedCounts.get(key) ?? 0;
    if (a > e) extra += a - e;
    if (e > a) missing += e - a;
  }
  return { extra, missing };
}

export function generateReview(actual: TableResult, problem: Problem): string {
  const expectedColumnCount = problem.expectedResult[0]
    ? Object.keys(problem.expectedResult[0]).length
    : 0;

  if (expectedColumnCount > 0 && actual.columns.length !== expectedColumnCount) {
    return "SELECTする列の数を確認しましょう";
  }

  const actualRows = actual.rows.map(canonicalRow);
  const expectedRows = problem.expectedResult.map((row) => canonicalRow(Object.values(row)));
  const { extra, missing } = multisetDiff(actualRows, expectedRows);

  if (problem.orderMatters && extra === 0 && missing === 0) {
    return "ORDER BYを確認しましょう";
  }
  if (extra > 0 && missing === 0) {
    return "抽出条件が緩すぎるかもしれません。WHERE句の条件を見直しましょう";
  }
  if (missing > 0 && extra === 0) {
    return "抽出条件が厳しすぎるかもしれません。比較演算子や条件を見直しましょう";
  }
  return "結果の値を見直しましょう";
}
```

- [ ] **Step 8: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS（全テストファイル）

- [ ] **Step 9: コミットする**

```bash
git add apps/web/src/judge apps/web/src/review
git commit -m "feat: implement rule-based review generation"
```

---

### Task 2: apps/web — App.tsxへの組み込み、E2Eテスト拡張

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `e2e/sql-execution.spec.ts`

**Interfaces:**
- Consumes: `generateReview`（Task 1、`apps/web/src/review`）、`judge`（既存）
- Produces: なし（画面のふるまいがこのタスクのゴール）

- [ ] **Step 1: `apps/web/src/App.tsx` を書き換える**

現在のファイル全体を以下に置き換える:

```tsx
import { useCallback, useEffect, useState } from "react";
import type { PGlite } from "@electric-sql/pglite";
import { problems } from "@sql-practice/problems";
import { createDb, runQuery } from "./db/pglite";
import type { TableResult } from "./db/queryResult";
import { judge } from "./judge";
import { generateReview } from "./review";
import { TerminalView } from "./terminal/TerminalView";

const problem = problems[0];

function App() {
  const [db, setDb] = useState<PGlite | null>(null);
  const [result, setResult] = useState<TableResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [review, setReview] = useState<string | null>(null);

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
        const isCorrect = judge(tableResult, problem);
        setResult(tableResult);
        setCorrect(isCorrect);
        setReview(isCorrect ? null : generateReview(tableResult, problem));
      } catch (err) {
        setResult(null);
        setCorrect(null);
        setReview(null);
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
      {review && <p data-testid="review">{review}</p>}
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

- [ ] **Step 2: `e2e/sql-execution.spec.ts` を拡張する**

現在のファイル全体を以下に置き換える（不正解ケースのテストにレビュー文のアサーションを追加する）:

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
  await expect(table).toContainText("Bob");

  const verdict = page.getByTestId("judge-result");
  await expect(verdict).toContainText("×");

  const review = page.getByTestId("review");
  await expect(review).toContainText("抽出条件が緩すぎるかもしれません");
});
```

- [ ] **Step 3: ユニットテスト・ビルドが通ることを確認する**

```bash
pnpm test
pnpm build
```

Expected: 両方成功

- [ ] **Step 4: E2Eテストが通ることを確認する**

```bash
pnpm test:e2e
```

Expected: `2 passed`

- [ ] **Step 5: コミットする**

```bash
git add apps/web e2e
git commit -m "feat: show rule-based review feedback on incorrect answers"
```

---
