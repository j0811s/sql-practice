# judgeのApp.tsx組み込み 設計書

- 日付: 2026-07-19
- 対象: `judge()` を `apps/web` の画面に組み込み、正解/不正解を表示する（`docs/superpowers/specs/2026-07-18-judge-design.md` の後続）

## 背景・目的

`judge(actual: TableResult, problem: Problem): boolean` は実装済みだが、`App.tsx` からは呼ばれておらず、画面上で正解/不正解を確認する手段がない。この設計は、既存の唯一の問題（`packages/problems/where/001.json`）を実際に画面へ組み込み、ユーザーが入力したSQLの正誤を判定・表示するところまでを対象とする。

複数問題の選択UI、`apps/api` との連携、レビュー生成、XPシステムは対象外（後続タスク）。

## スコープ

### 対象

- `packages/problems/index.ts`（新規） — 検証済み `Problem[]` をexportするエントリポイント
- `packages/problems/package.json` — `exports` フィールド追加
- `packages/problems/index.test.ts`（新規）
- `apps/web/package.json` — `@sql-practice/problems` を依存に追加
- `apps/web/src/App.tsx` — 固定`SEED_SQL`を問題の`schema`/`seed`に置き換え、`judge()`呼び出しと正解/不正解表示を追加
- `e2e/sql-execution.spec.ts` — 正解ケースへの○表示チェック追加、不正解ケースのテスト追加

### 対象外（後続タスク）

- 複数問題の選択・一覧UI
- `apps/api` の `/api/problems` との連携
- レビュー生成ロジック
- XP・レベルシステム
- Reactコンポーネント単体テスト（React Testing Library等）の導入

## packages/problems のエントリポイント

現在 `packages/problems` は生JSONファイルのみで、ブラウザから読み込む手段がない（`apps/api` の `loadProblems` はNodeの`fs`を使うため、ブラウザでは使えない）。`packages/problems/index.ts` を新設し、静的importで問題一覧を検証済みの形でexportする。

```ts
import { parseProblem, type Problem } from "@sql-practice/shared";
import where001 from "./where/001.json";

export const problems: Problem[] = [where001].map(parseProblem);
```

- `packages/problems/package.json` に `"exports": { ".": "./index.ts" }` を追加する（`packages/shared`と同じ流儀）。
- 問題が増えたら配列にimportを追記していく方式。今は1件のみなのでYAGNIに忠実な最小実装とする。
- `resolveJsonModule: true` は `tsconfig.base.json` で既に有効なため追加設定不要。
- `apps/web/package.json` に `@sql-practice/problems: workspace:*` を追加する。

## App.tsx の変更

- 固定の `SEED_SQL` 定数を削除し、`problems[0]`（問題001）の `schema` → `seed` の順にDB初期化時実行する。
- 見出し下の固定文言を `problem.question` に置き換える。
- `handleSubmit` 成功時に `judge(tableResult, problem)` を呼び、結果を `correct: boolean | null` というstateに保存する（初期値`null` = 未実行）。エラー時は `correct` も `null` に戻す。
- 表示順は「エラー → ○/×フィードバック → 結果テーブル」。フィードバックは `data-testid="judge-result"` を付けた `<p>` 要素（正解: `○ 正解です！`、不正解: `× 不正解です。もう一度考えてみましょう`）。

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

## テスト計画

- `packages/problems/index.test.ts`（新規）: `problems` 配列に問題001が正しくパースされて含まれることを検証する。
- `e2e/sql-execution.spec.ts` を拡張する:
  - 既存の正解ケースに `judge-result` の○表示チェックを追加する。
  - 不正解ケース（条件を満たさないSQLを実行）を新しいテストとして追加し、×表示を検証する。
- `App.tsx` のコンポーネント単体テストは追加しない。既存方針通りPlaywright E2Eでカバーする。
