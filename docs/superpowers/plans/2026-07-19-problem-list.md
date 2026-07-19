# 複数問題選択UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 問題一覧を常時表示し、クリックで問題を切り替えられるようにする。

**Architecture:** `apps/web/src/problem-list/ProblemList.tsx` に一覧表示コンポーネントを新設し、`App.tsx` に `selectedProblemId` stateを導入する。問題切り替え時はPGliteインスタンスを作り直し、判定・レビュー・結果表示のstateをリセットする。

**Tech Stack:** TypeScript, React, Playwright（既存構成のまま。新規依存パッケージなし）

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-07-19-problem-list-design.md`（承認済み）
- `ProblemList` は Reactコンポーネント単体テストを追加しない（既存方針を継続し、Playwright E2Eで検証する）
- 問題切り替え時は古いPGliteインスタンスの`close()`を呼び、リソースを解放する
- XP・レベル表示は問題切り替えの影響を受けず、全問題共通の値を継続表示する
- 対象外（本計画では実装しない）: 問題一覧の視覚的なデザイン調整（CSS）、複数問題を前提とした切り替えの網羅的なE2E検証、カテゴリ別フィルタ・検索機能

---

### Task 1: apps/web — ProblemListの実装とApp.tsxへの組み込み

**Files:**
- Create: `apps/web/src/problem-list/ProblemList.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `e2e/sql-execution.spec.ts`

**Interfaces:**
- Consumes: `Problem`型（`@sql-practice/shared`、既存）、`problems`（`@sql-practice/problems`、既存）
- Produces: なし（画面のふるまいがこのタスクのゴール）

- [ ] **Step 1: `apps/web/src/problem-list/ProblemList.tsx` を作成する**

```tsx
import type { Problem } from "@sql-practice/shared";

interface ProblemListProps {
  problems: Problem[];
  selectedId: number;
  completedIds: number[];
  onSelect: (id: number) => void;
}

export function ProblemList({ problems, selectedId, completedIds, onSelect }: ProblemListProps) {
  return (
    <ul data-testid="problem-list">
      {problems.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onSelect(p.id)}
            aria-current={p.id === selectedId}
            data-testid={`problem-item-${p.id}`}
          >
            {completedIds.includes(p.id) ? "✓ " : ""}
            {p.title}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: `apps/web/src/App.tsx` を書き換える**

現在のファイル全体を以下に置き換える:

```tsx
import { useCallback, useEffect, useState } from "react";
import type { PGlite } from "@electric-sql/pglite";
import { problems } from "@sql-practice/problems";
import { createDb, runQuery } from "./db/pglite";
import type { TableResult } from "./db/queryResult";
import { judge } from "./judge";
import { ProblemList } from "./problem-list/ProblemList";
import { generateReview } from "./review";
import { TerminalView } from "./terminal/TerminalView";
import { calculateLevel, totalXp } from "./xp";

const COMPLETED_STORAGE_KEY = "sql-practice:completed-problems";

function loadCompletedIds(): number[] {
  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function App() {
  const [selectedProblemId, setSelectedProblemId] = useState<number>(problems[0].id);
  const [db, setDb] = useState<PGlite | null>(null);
  const [result, setResult] = useState<TableResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<number[]>(loadCompletedIds);

  const problem = problems.find((p) => p.id === selectedProblemId) ?? problems[0];

  useEffect(() => {
    let cancelled = false;
    setDb(null);
    setResult(null);
    setError(null);
    setCorrect(null);
    setReview(null);

    void createDb().then(async (instance) => {
      for (const statement of [...problem.schema, ...problem.seed]) {
        await instance.exec(statement);
      }
      if (!cancelled) setDb(instance);
    });

    return () => {
      cancelled = true;
    };
  }, [problem]);

  useEffect(() => {
    if (!db) return;
    return () => {
      void db.close();
    };
  }, [db]);

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

        if (isCorrect) {
          const current = loadCompletedIds();
          if (!current.includes(problem.id)) {
            const next = [...current, problem.id];
            localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(next));
            setCompletedIds(next);
          }
        }
      } catch (err) {
        setResult(null);
        setCorrect(null);
        setReview(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [db, problem],
  );

  const xp = totalXp(completedIds, problems);
  const level = calculateLevel(xp);

  return (
    <main>
      <h1>SQL Practice</h1>
      <ProblemList
        problems={problems}
        selectedId={selectedProblemId}
        completedIds={completedIds}
        onSelect={setSelectedProblemId}
      />
      <p data-testid="xp-status">
        Lv.{level} ({xp} XP)
      </p>
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

- [ ] **Step 3: `e2e/sql-execution.spec.ts` に問題一覧の表示・選択確認テストを追加する**

現在のファイルの末尾（最後の `});` の直後）に以下のテストを追加する:

```ts

test("shows the problem list with the current problem selected", async ({ page }) => {
  await page.goto("/");

  const list = page.getByTestId("problem-list");
  await expect(list).toBeVisible();

  const item = page.getByTestId("problem-item-1");
  await expect(item).toBeVisible();
  await expect(item).toHaveAttribute("aria-current", "true");
});
```

- [ ] **Step 4: ユニットテスト・ビルドが通ることを確認する**

```bash
pnpm test
pnpm build
```

Expected: 両方成功

- [ ] **Step 5: E2Eテストが通ることを確認する**

```bash
pnpm test:e2e
```

Expected: `4 passed`

- [ ] **Step 6: コミットする**

```bash
git add apps/web e2e
git commit -m "feat: add problem list UI for switching between problems"
```

---
