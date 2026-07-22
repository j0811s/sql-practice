# 段階的ヒント機能（キーワードパズル） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「ヒントを見る」の先に「もっとヒントを見る」を追加し、押すと正解クエリを単語単位にバラしてシャッフルしたボタン群を表示、クリックした単語がターミナルの入力行に追記される機能を作る。

**Architecture:** `Problem`に正準の`answerQuery: string`を追加（全15問のJSONに設定）し、これを空白区切りでトークン化・シャッフルする2つの純粋関数（`tokenizeQuery`/`shuffle`）を新設する。`TerminalView`を`forwardRef`化して`insertText(text)`を公開し、既存の`paste`イベント（`reduceLineBuffer`にすでにある「バッファ末尾に追記してそのままエコー」処理）をそのまま再利用する。新規`HintWordPuzzle`コンポーネントが単語ボタン群と使用済み状態を持ち、`App.tsx`が両者を配線する。

**Tech Stack:** TypeScript, React, xterm.js, Vitest, Playwright（既存構成のまま。新規依存パッケージなし）

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-07-22-hint-word-puzzle-design.md`（承認済み）
- 単語ボタンの並びはシャッフル（パズル式）。正解の語順どおりには並べない
- 正解クエリ全体を単語分解する（構文キーワードだけに絞らない）
- クリックした単語ボタンは即座に使用済み（disabled）にする。同じ単語が複数回登場する場合はトークンごとに独立したボタンにする
- ターミナルのbackspaceと単語ボタンの使用済み状態は同期させない（既知の制約として許容）。単語パズル側には使用済み状態だけをリセットする「リセット」リンクを置く
- `answerQuery`のトークン化は空白区切りのみ（`sql.trim().split(/\s+/)`）。SQL構文を意識した分割はしない
- `lineBuffer.ts`自体は変更しない。既存の`paste`イベントをそのまま使う
- 対象外（本計画では実装しない）: backspaceとボタン状態の同期、ヒント使用によるXP減点、構文キーワードのみのトークン化

---

### Task 1: packages/shared — `Problem`に`answerQuery`を追加する

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/parseProblem.ts`
- Modify: `packages/shared/src/parseProblem.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `Problem.answerQuery: string`（Task 2でJSONに実データを入れる。Task 5で`App.tsx`が読む）

このタスクの実行順序が重要: Step 1〜3（テストのfixtureに`answerQuery`を追加し、新しい失敗するテストを書く）は`packages/problems`のJSONにまだ触れないため、この時点ではまだ検証を実装していないので既存テストは全て通ったままになる。Step 4〜5で`types.ts`・`parseProblem.ts`を更新して初めて検証が有効になるが、**Task 2を先に実行しない限り**`packages/problems`配下の実JSONには`answerQuery`がないため、Task 1のStep 6（`pnpm test`実行）の時点では`packages/problems`のテストが失敗する。これは想定内であり、Task 2完了時点で解消される（Task 1単体では`packages/shared`のテストのみ緑になることを確認する）。

- [ ] **Step 1: `packages/shared/src/parseProblem.test.ts`の`validProblem`に`answerQuery`を追加する**

`hint`と`orderMatters`の間に1行追加する:

```ts
  hint: ["WHERE句を使います。", "『以上』なので比較演算子を確認してみましょう。"],
  answerQuery: "SELECT id, name, age FROM users WHERE age >= 20;",
  orderMatters: false,
```

- [ ] **Step 2: 失敗するテストを追加する — `packages/shared/src/parseProblem.test.ts`**

`"throws when orderMatters has the wrong type"`のテストの直後に追加する:

```ts

  it("throws when answerQuery has the wrong type", () => {
    expect(() => parseProblem({ ...validProblem, answerQuery: 123 })).toThrow(
      "Problem.answerQuery must be a string",
    );
  });
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `npx vitest run packages/shared/src/parseProblem.test.ts`
Expected: FAIL — `"throws when answerQuery has the wrong type"`が失敗する（`parseProblem`がまだ`answerQuery`を検証しないため、エラーが投げられない）。他の既存テストは全てPASSのまま

- [ ] **Step 4: `packages/shared/src/types.ts`を更新する**

現在のファイル全体を以下に置き換える:

```ts
export interface Problem {
  id: number;
  title: string;
  difficulty: number;
  category: string;
  question: string;
  schema: string[];
  seed: string[];
  expectedResult: Record<string, unknown>[];
  hint: string[];
  answerQuery: string;
  orderMatters: boolean;
}
```

- [ ] **Step 5: `packages/shared/src/parseProblem.ts`を更新する**

`if (!isStringArray(candidate.hint)) throw new Error("Problem.hint must be a string array");`の直後に追加する:

```ts
  if (typeof candidate.answerQuery !== "string") {
    throw new Error("Problem.answerQuery must be a string");
  }
```

- [ ] **Step 6: `packages/shared`のテストが通ることを確認する**

Run: `npx vitest run packages/shared/src/parseProblem.test.ts`
Expected: PASS（全4テスト）

- [ ] **Step 7: コミットする**

```bash
git add packages/shared
git commit -m "feat(shared): add answerQuery field to Problem"
```

---

### Task 2: packages/problems — 全15問に`answerQuery`を追加する

**Files:**
- Modify: `packages/problems/where/001.json`, `where/001.test.ts`
- Modify: `packages/problems/where/002.json`, `where/002.test.ts`
- Modify: `packages/problems/where/003.json`, `where/003.test.ts`
- Modify: `packages/problems/where/004.json`, `where/004.test.ts`
- Modify: `packages/problems/orderby/001.json`, `orderby/001.test.ts`
- Modify: `packages/problems/orderby/002.json`, `orderby/002.test.ts`
- Modify: `packages/problems/orderby/003.json`, `orderby/003.test.ts`
- Modify: `packages/problems/orderby/004.json`, `orderby/004.test.ts`
- Modify: `packages/problems/groupby/001.json`, `groupby/001.test.ts`
- Modify: `packages/problems/groupby/002.json`, `groupby/002.test.ts`
- Modify: `packages/problems/groupby/003.json`, `groupby/003.test.ts`
- Modify: `packages/problems/groupby/004.json`, `groupby/004.test.ts`
- Modify: `packages/problems/join/001.json`, `join/001.test.ts`
- Modify: `packages/problems/join/002.json`, `join/002.test.ts`
- Modify: `packages/problems/join/003.json`, `join/003.test.ts`

**Interfaces:**
- Consumes: Task 1の`parseProblem`（`answerQuery`を検証する）
- Produces: 15問全てが`answerQuery`を持つ`problems`配列（Task 3以降がこれを読む）

各`answerQuery`は実PGliteで`judge()`が`true`を返すことを検証済み（`docs/superpowers/specs/2026-07-22-hint-word-puzzle-design.md`の一覧を参照）。JSONファイルは`"hint": [...]`の直後、`"orderMatters": ...`の直前に`"answerQuery"`を1行追加する。テストファイルは`expect(problem.category).toBe(...)`の直後に`answerQuery`が空でない文字列であることを確認する1行を追加する。

- [ ] **Step 1: `packages/problems/where/001.json`を更新する**

```json
  "hint": ["WHERE句を使います。", "『以上』なので比較演算子を確認してみましょう。"],
  "answerQuery": "SELECT id, name, age FROM users WHERE age >= 20;",
  "orderMatters": false
```

- [ ] **Step 2: `packages/problems/where/001.test.ts`を更新する**

`expect(problem.category).toBe("WHERE");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 3: `packages/problems/where/002.json`を更新する**

```json
  "hint": ["WHERE句で文字列を比較する際は引用符で囲みます。", "dept列の値を確認してみましょう。"],
  "answerQuery": "SELECT id, name, age, dept FROM users WHERE dept = 'Engineering';",
  "orderMatters": false
```

- [ ] **Step 4: `packages/problems/where/002.test.ts`を更新する**

`expect(problem.category).toBe("WHERE");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 5: `packages/problems/where/003.json`を更新する**

```json
  "hint": ["WHERE句を使います。", "『未満』なので比較演算子を確認してみましょう。"],
  "answerQuery": "SELECT id, name, age, dept FROM users WHERE age < 30;",
  "orderMatters": false
```

- [ ] **Step 6: `packages/problems/where/003.test.ts`を更新する**

`expect(problem.category).toBe("WHERE");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 7: `packages/problems/where/004.json`を更新する**

```json
  "hint": ["IN演算子は複数の値のいずれかに一致する行を取得します。", "WHERE dept IN ('Sales', 'Marketing') のように書きます。"],
  "answerQuery": "SELECT id, name, age, dept FROM users WHERE dept IN ('Sales', 'Marketing');",
  "orderMatters": false
```

- [ ] **Step 8: `packages/problems/where/004.test.ts`を更新する**

`expect(problem.category).toBe("WHERE");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 9: `packages/problems/orderby/001.json`を更新する**

```json
  "hint": ["ORDER BY句を使います。", "昇順はASC（省略可能）です。"],
  "answerQuery": "SELECT id, name, age, dept FROM users ORDER BY age ASC;",
  "orderMatters": true
```

- [ ] **Step 10: `packages/problems/orderby/001.test.ts`を更新する**

`expect(problem.category).toBe("ORDERBY");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 11: `packages/problems/orderby/002.json`を更新する**

```json
  "hint": ["ORDER BY句を使います。", "降順はDESCを指定します。"],
  "answerQuery": "SELECT id, name, age, dept FROM users ORDER BY age DESC;",
  "orderMatters": true
```

- [ ] **Step 12: `packages/problems/orderby/002.test.ts`を更新する**

`expect(problem.category).toBe("ORDERBY");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 13: `packages/problems/orderby/003.json`を更新する**

```json
  "hint": ["ORDER BYで並べ替えた後、LIMITで件数を絞り込めます。", "上位3件なのでLIMIT 3を指定します。"],
  "answerQuery": "SELECT id, name, age, dept FROM users ORDER BY age DESC LIMIT 3;",
  "orderMatters": true
```

- [ ] **Step 14: `packages/problems/orderby/003.test.ts`を更新する**

`expect(problem.category).toBe("ORDERBY");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 15: `packages/problems/orderby/004.json`を更新する**

```json
  "hint": ["ORDER BYには複数の列をカンマ区切りで指定できます。", "部署名は昇順（ASC）、年齢は降順（DESC）にします。"],
  "answerQuery": "SELECT id, name, age, dept FROM users ORDER BY dept ASC, age DESC;",
  "orderMatters": true
```

- [ ] **Step 16: `packages/problems/orderby/004.test.ts`を更新する**

`expect(problem.category).toBe("ORDERBY");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 17: `packages/problems/groupby/001.json`を更新する**

```json
  "hint": ["GROUP BY句を使います。", "件数を数えるにはCOUNT(*)を使います。"],
  "answerQuery": "SELECT dept, COUNT(*) FROM users GROUP BY dept;",
  "orderMatters": false
```

- [ ] **Step 18: `packages/problems/groupby/001.test.ts`を更新する**

`expect(problem.category).toBe("GROUPBY");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 19: `packages/problems/groupby/002.json`を更新する**

```json
  "hint": ["GROUP BY句を使います。", "合計を求めるにはSUM()を使います。"],
  "answerQuery": "SELECT dept, SUM(age) FROM users GROUP BY dept;",
  "orderMatters": false
```

- [ ] **Step 20: `packages/problems/groupby/002.test.ts`を更新する**

`expect(problem.category).toBe("GROUPBY");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 21: `packages/problems/groupby/003.json`を更新する**

```json
  "hint": ["HAVING句はGROUP BYでまとめた後の集計結果に条件を指定します。", "人数を数えるにはCOUNT(*)を使います。"],
  "answerQuery": "SELECT dept, COUNT(*) FROM users GROUP BY dept HAVING COUNT(*) >= 3;",
  "orderMatters": false
```

- [ ] **Step 22: `packages/problems/groupby/003.test.ts`を更新する**

`expect(problem.category).toBe("GROUPBY");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 23: `packages/problems/groupby/004.json`を更新する**

```json
  "hint": ["MAX()は最大値を求める集計関数です。", "GROUP BYと組み合わせて部署ごとの最大値を求めます。"],
  "answerQuery": "SELECT dept, MAX(age) FROM users GROUP BY dept;",
  "orderMatters": false
```

- [ ] **Step 24: `packages/problems/groupby/004.test.ts`を更新する**

`expect(problem.category).toBe("GROUPBY");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 25: `packages/problems/join/001.json`を更新する**

```json
  "hint": ["JOIN句を使って2つのテーブルを結合します。", "ON句でusers.dept_idとdepartments.idを一致させます。"],
  "answerQuery": "SELECT users.name, departments.name FROM users JOIN departments ON users.dept_id = departments.id;",
  "orderMatters": false
```

- [ ] **Step 26: `packages/problems/join/001.test.ts`を更新する**

`expect(problem.category).toBe("JOIN");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 27: `packages/problems/join/002.json`を更新する**

```json
  "hint": ["JOIN句とWHERE句を組み合わせます。", "departments.nameで部署名を絞り込みます。"],
  "answerQuery": "SELECT users.name FROM users JOIN departments ON users.dept_id = departments.id WHERE departments.name = 'Marketing';",
  "orderMatters": false
```

- [ ] **Step 28: `packages/problems/join/002.test.ts`を更新する**

`expect(problem.category).toBe("JOIN");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 29: `packages/problems/join/003.json`を更新する**

```json
  "hint": ["LEFT JOINは左側のテーブルの行を、一致がなくてもすべて残します。", "一致しない場合、右側テーブルの列はNULLになります。"],
  "answerQuery": "SELECT users.name, departments.name FROM users LEFT JOIN departments ON users.dept_id = departments.id;",
  "orderMatters": false
```

- [ ] **Step 30: `packages/problems/join/003.test.ts`を更新する**

`expect(problem.category).toBe("JOIN");`の直後に追加する:

```ts
    expect(problem.answerQuery.length).toBeGreaterThan(0);
```

- [ ] **Step 31: 全テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS（全テストファイル。Task 1で追加した`packages/shared`の検証と合わせて、`packages/problems`・`apps/api`のテストも全て緑になる）

- [ ] **Step 32: `answerQuery`が実際に正解になることを再確認する（使い捨てスクリプト）**

コミット対象外の使い捨てスクリプトで、`packages/problems`の`problems`配列から各`answerQuery`を実PGlite上で実行し、`apps/web/src/judge`の`judge()`が全問`true`を返すことを確認する（設計フェーズで一度検証済みだが、JSON転記ミスがないことをここでも再確認する）。確認後スクリプトは削除する。

- [ ] **Step 33: コミットする**

```bash
git add packages/problems
git commit -m "feat(problems): add answerQuery to all problem data"
```

---

### Task 3: apps/web/src/hint — `tokenizeQuery`・`shuffle`純粋関数

**Files:**
- Create: `apps/web/src/hint/tokenizeQuery.ts`
- Create: `apps/web/src/hint/tokenizeQuery.test.ts`
- Create: `apps/web/src/hint/shuffle.ts`
- Create: `apps/web/src/hint/shuffle.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `tokenizeQuery(sql: string): string[]`、`shuffle<T>(items: T[], random?: () => number): T[]`（Task 5の`App.tsx`が使う）

- [ ] **Step 1: 失敗するテストを書く — `apps/web/src/hint/tokenizeQuery.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { tokenizeQuery } from "./tokenizeQuery";

describe("tokenizeQuery", () => {
  it("splits a query into whitespace-separated tokens", () => {
    expect(tokenizeQuery("SELECT id, name, age FROM users WHERE age >= 20;")).toEqual([
      "SELECT",
      "id,",
      "name,",
      "age",
      "FROM",
      "users",
      "WHERE",
      "age",
      ">=",
      "20;",
    ]);
  });

  it("ignores leading/trailing whitespace and collapses repeated spaces", () => {
    expect(tokenizeQuery("  SELECT   1;  ")).toEqual(["SELECT", "1;"]);
  });

  it("rejoins with single spaces back into the original query", () => {
    const sql = "SELECT dept, COUNT(*) FROM users GROUP BY dept HAVING COUNT(*) >= 3;";
    expect(tokenizeQuery(sql).join(" ")).toBe(sql);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run apps/web/src/hint/tokenizeQuery.test.ts`
Expected: FAIL — `tokenizeQuery`モジュールが存在しない

- [ ] **Step 3: 最小実装を書く — `apps/web/src/hint/tokenizeQuery.ts`**

```ts
export function tokenizeQuery(sql: string): string[] {
  return sql.trim().split(/\s+/);
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run apps/web/src/hint/tokenizeQuery.test.ts`
Expected: PASS（3テスト）

- [ ] **Step 5: 失敗するテストを書く — `apps/web/src/hint/shuffle.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { shuffle } from "./shuffle";

describe("shuffle", () => {
  it("returns a new array without mutating the input", () => {
    const input = [1, 2, 3];
    const result = shuffle(input, () => 0);
    expect(input).toEqual([1, 2, 3]);
    expect(result).not.toBe(input);
  });

  it("keeps the same elements (as a multiset)", () => {
    const result = shuffle(["a", "b", "c", "d"], () => 0.5);
    expect(result.slice().sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("is deterministic for an injected random source", () => {
    const random = () => 0; // backward Fisher-Yates: always swaps with the lowest unshuffled index
    expect(shuffle([1, 2, 3, 4], random)).toEqual([2, 3, 4, 1]);
  });
});
```

- [ ] **Step 6: テストが失敗することを確認する**

Run: `npx vitest run apps/web/src/hint/shuffle.test.ts`
Expected: FAIL — `shuffle`モジュールが存在しない

- [ ] **Step 7: 最小実装を書く — `apps/web/src/hint/shuffle.ts`**

```ts
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

- [ ] **Step 8: テストが通ることを確認する**

Run: `npx vitest run apps/web/src/hint/shuffle.test.ts`
Expected: PASS（3テスト）

- [ ] **Step 9: コミットする**

```bash
git add apps/web/src/hint
git commit -m "feat(web): add tokenizeQuery and shuffle hint utilities"
```

---

### Task 4: apps/web/src/terminal/TerminalView.tsx — `insertText`のref API化

**Files:**
- Modify: `apps/web/src/terminal/TerminalView.tsx`

**Interfaces:**
- Consumes: `reduceLineBuffer`・`toLineBufferEvent`・`replaceLineEcho`（`./lineBuffer`、既存・変更なし）
- Produces: `TerminalViewHandle { insertText(text: string): void }`型と、`forwardRef<TerminalViewHandle, TerminalViewProps>`になった`TerminalView`（Task 5の`App.tsx`が`ref`経由で使う）

このタスクは`TerminalView`の公開シグネチャを変える（`ref`を受け取れるようになる）が、まだ誰も`insertText`を呼ばないため、既存のユニットテスト・E2Eテストは無変更のまま全て通る必要がある（回帰がないことの確認が this タスクの検証内容）。

- [ ] **Step 1: `apps/web/src/terminal/TerminalView.tsx`を全面的に置き換える**

現在のファイル全体を以下に置き換える:

```tsx
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import type { LineBufferEvent, LineBufferResult } from "./lineBuffer";
import { reduceLineBuffer, replaceLineEcho, toLineBufferEvent } from "./lineBuffer";

const PROMPT = "sql> ";

const FONT_MONO =
  '"SF Mono", "JetBrains Mono", "IBM Plex Mono", ui-monospace, Menlo, Consolas, "Cascadia Code", monospace';

const THEME = {
  background: "#0f1115",
  foreground: "#e7e9ee",
  cursor: "#6d93ff",
  cursorAccent: "#0f1115",
  selectionBackground: "rgba(109, 147, 255, 0.35)",
  black: "#0f1115",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#e3a34e",
  blue: "#6d93ff",
  magenta: "#c084fc",
  cyan: "#67e8f9",
  white: "#e7e9ee",
  brightBlack: "#3a3e4a",
  brightRed: "#fca5a5",
  brightGreen: "#86efac",
  brightYellow: "#f2c185",
  brightBlue: "#93b4ff",
  brightMagenta: "#d8b4fe",
  brightCyan: "#a5f3fc",
  brightWhite: "#ffffff",
};

interface TerminalViewProps {
  onSubmit: (sql: string) => void;
}

export interface TerminalViewHandle {
  insertText: (text: string) => void;
}

export const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(function TerminalView(
  { onSubmit },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const insertTextRef = useRef<(text: string) => void>(() => {});

  useImperativeHandle(ref, () => ({
    insertText: (text) => insertTextRef.current(text),
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: FONT_MONO,
      fontSize: 14,
      lineHeight: 1.5,
      theme: THEME,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    term.write(PROMPT);

    let buffer = "";
    let draft = "";
    const history: string[] = [];
    let historyIndex = 0;

    const applyEvent = (event: LineBufferEvent): LineBufferResult => {
      const result = reduceLineBuffer(buffer, event);
      buffer = result.buffer;
      term.write(result.echo);
      return result;
    };

    const disposable = term.onData((data) => {
      const event = toLineBufferEvent(data);
      if (!event) return;

      if (event.type === "history-prev" || event.type === "history-next") {
        if (event.type === "history-prev" && historyIndex > 0) {
          if (historyIndex === history.length) draft = buffer;
          historyIndex -= 1;
          term.write(replaceLineEcho(buffer, history[historyIndex]));
          buffer = history[historyIndex];
        } else if (event.type === "history-next" && historyIndex < history.length) {
          historyIndex += 1;
          const line = historyIndex === history.length ? draft : history[historyIndex];
          term.write(replaceLineEcho(buffer, line));
          buffer = line;
        }
        return;
      }

      const result = applyEvent(event);

      if (result.submittedLine !== undefined) {
        if (result.submittedLine.trim() !== "") {
          history.push(result.submittedLine);
        }
        historyIndex = history.length;
        draft = "";
        onSubmit(result.submittedLine);
        term.write(PROMPT);
      }
    });

    insertTextRef.current = (text) => {
      applyEvent({ type: "paste", text });
      term.focus();
    };

    term.attachCustomKeyEventHandler((event) => {
      const isCopyShortcut = (event.ctrlKey || event.metaKey) && event.code === "KeyC";
      if (event.type === "keydown" && isCopyShortcut && term.hasSelection()) {
        void navigator.clipboard.writeText(term.getSelection());
        return false;
      }
      return true;
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      insertTextRef.current = () => {};
      disposable.dispose();
      term.dispose();
    };
  }, [onSubmit]);

  return <div ref={containerRef} className="terminal-surface" />;
});
```

- [ ] **Step 2: `packages/shared`を除く既存テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS（全テストファイル。`TerminalView`には単体テストがないため、この変更で新たに壊れるユニットテストはない）

- [ ] **Step 3: ビルドが通ることを確認する**

```bash
pnpm build
```

Expected: 成功（`forwardRef`化による型エラーがないことを確認する）

- [ ] **Step 4: 既存E2Eが通ることを確認する（回帰確認）**

```bash
pnpm test:e2e
```

Expected: PASS（既存5テスト全て。ターミナルへの直接入力・Enter送信・履歴操作など、`onData`経由の挙動に変化がないことを確認する）

- [ ] **Step 5: コミットする**

```bash
git add apps/web/src/terminal/TerminalView.tsx
git commit -m "feat(web): expose insertText ref API on TerminalView"
```

---

### Task 5: apps/web — `HintWordPuzzle`コンポーネントと`App.tsx`の配線

**Files:**
- Create: `apps/web/src/hint/HintWordPuzzle.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/index.css`

**Interfaces:**
- Consumes: `tokenizeQuery`・`shuffle`（Task 3）、`TerminalView`・`TerminalViewHandle`（Task 4）、`problem.answerQuery`（Task 1・2）
- Produces: 画面上の「もっとヒントを見る」導線と単語パズルUI（このタスクで完結、後続タスクなし）

- [ ] **Step 1: `apps/web/src/hint/HintWordPuzzle.tsx`を作成する**

```tsx
import { useState } from "react";

interface HintWordPuzzleProps {
  words: string[];
  onInsert: (word: string) => void;
}

export function HintWordPuzzle({ words, onInsert }: HintWordPuzzleProps) {
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());

  return (
    <div className="hint-puzzle" data-testid="hint-puzzle">
      <div className="hint-puzzle__words">
        {words.map((word, i) => (
          <button
            key={i}
            type="button"
            className="hint-word"
            data-testid={`hint-word-${i}`}
            disabled={usedIndices.has(i)}
            onClick={() => {
              onInsert(word);
              setUsedIndices((prev) => new Set(prev).add(i));
            }}
          >
            {word}
          </button>
        ))}
      </div>
      {usedIndices.size > 0 && (
        <button
          type="button"
          className="hint-puzzle__reset"
          data-testid="hint-puzzle-reset"
          onClick={() => setUsedIndices(new Set())}
        >
          リセット
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `apps/web/src/App.tsx`のimportを更新する**

現在の先頭のimport群を以下に置き換える:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PGlite } from "@electric-sql/pglite";
import { problems } from "@sql-practice/problems";
import { createDb, runQuery } from "./db/pglite";
import type { TableResult } from "./db/queryResult";
import { HintWordPuzzle } from "./hint/HintWordPuzzle";
import { shuffle } from "./hint/shuffle";
import { tokenizeQuery } from "./hint/tokenizeQuery";
import { judge } from "./judge";
import { ProblemList } from "./problem-list/ProblemList";
import { generateReview } from "./review";
import { parseSchema } from "./schema/parseSchema";
import { SchemaView } from "./schema/SchemaView";
import { TerminalView } from "./terminal/TerminalView";
import type { TerminalViewHandle } from "./terminal/TerminalView";
import { calculateLevel, totalXp } from "./xp";
```

- [ ] **Step 3: `App`関数内にstateと`terminalRef`を追加する**

`const [hintShown, setHintShown] = useState(false);`の直後に追加する:

```tsx
  const [wordHintWords, setWordHintWords] = useState<string[] | null>(null);
  const terminalRef = useRef<TerminalViewHandle>(null);
```

- [ ] **Step 4: 問題切り替え時のリセットに`wordHintWords`を追加する**

`setHintShown(false);`（問題切り替え用の`useEffect`内、`setDb(null);`などと並ぶ箇所）の直後に追加する:

```tsx
    setWordHintWords(null);
```

- [ ] **Step 5: ヒントセクションのJSXを書き換える**

既存の以下のブロックを:

```tsx
          {problem.hint.length > 0 && (
            <section className="hint-section">
              {hintShown ? (
                <>
                  <p className="panel-label">HINT</p>
                  <p className="hint-text" data-testid="hint-text">
                    {problem.hint.join(" ")}
                  </p>
                </>
              ) : (
                <button
                  type="button"
                  className="hint-reveal"
                  data-testid="hint-reveal"
                  onClick={() => setHintShown(true)}
                >
                  ヒントを見る
                </button>
              )}
            </section>
          )}
```

以下に置き換える（既存の「ヒントを見る」ブロックはそのまま残し、その直後に新しい`hint-more-section`を追加する）:

```tsx
          {problem.hint.length > 0 && (
            <section className="hint-section">
              {hintShown ? (
                <>
                  <p className="panel-label">HINT</p>
                  <p className="hint-text" data-testid="hint-text">
                    {problem.hint.join(" ")}
                  </p>
                </>
              ) : (
                <button
                  type="button"
                  className="hint-reveal"
                  data-testid="hint-reveal"
                  onClick={() => setHintShown(true)}
                >
                  ヒントを見る
                </button>
              )}
            </section>
          )}

          {hintShown && (
            <section className="hint-more-section">
              {wordHintWords ? (
                <HintWordPuzzle
                  words={wordHintWords}
                  onInsert={(word) => terminalRef.current?.insertText(`${word} `)}
                />
              ) : (
                <button
                  type="button"
                  className="hint-reveal"
                  data-testid="hint-more-reveal"
                  onClick={() => setWordHintWords(shuffle(tokenizeQuery(problem.answerQuery)))}
                >
                  もっとヒントを見る
                </button>
              )}
            </section>
          )}
```

- [ ] **Step 6: `TerminalView`に`ref`を渡す**

既存の:

```tsx
            {db ? (
              <TerminalView onSubmit={handleSubmit} />
            ) : (
```

を以下に置き換える:

```tsx
            {db ? (
              <TerminalView ref={terminalRef} onSubmit={handleSubmit} />
            ) : (
```

- [ ] **Step 7: `apps/web/src/index.css`にスタイルを追加する**

`.hint-text { ... }`ブロックの直後、`/* ---------- result (query output) ---------- */`の直前に追加する:

```css
.hint-more-section {
  margin-top: 4px;
}

.hint-puzzle {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hint-puzzle__words {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hint-word {
  padding: 4px 10px;
  border: 1px solid var(--key);
  border-radius: 999px;
  background: var(--key-soft);
  color: var(--key);
  font-family: var(--font-mono);
  font-size: 13px;
  cursor: pointer;
}

.hint-word:hover:not(:disabled) {
  background: var(--key);
  color: var(--paper-raised);
}

.hint-word:disabled {
  opacity: 0.35;
  cursor: default;
}

.hint-puzzle__reset {
  align-self: flex-start;
  border: none;
  background: none;
  color: var(--ink-soft);
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}
```

- [ ] **Step 8: ユニットテスト・ビルドが通ることを確認する**

```bash
pnpm test
pnpm build
```

Expected: 両方成功

- [ ] **Step 9: コミットする**

```bash
git add apps/web/src
git commit -m "feat(web): add word-puzzle hint UI"
```

---

### Task 6: E2Eテストと目視確認

**Files:**
- Modify: `e2e/sql-execution.spec.ts`

**Interfaces:**
- Consumes: Task 1〜5で実装した全機能
- Produces: なし（最終検証タスク）

- [ ] **Step 1: `e2e/sql-execution.spec.ts`の末尾にテストを追加する**

ファイル末尾（最後の`});`の直後）に追加する。問題1（`SELECT id, name, age FROM users WHERE age >= 20;`）を使い、シャッフルされた単語ボタンをテキスト内容で（表示順に依存せず）クリックしていく:

```ts

test("reveals a shuffled word puzzle after both hint levels and inserts clicks into the terminal", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByTestId("hint-reveal").click();
  await expect(page.getByTestId("hint-text")).toBeVisible();

  await page.getByTestId("hint-more-reveal").click();
  const puzzle = page.getByTestId("hint-puzzle");
  await expect(puzzle).toBeVisible();

  const wordButtons = puzzle.locator(".hint-word");
  await expect(wordButtons).toHaveCount(10);

  const clickWord = async (word: string) => {
    const button = puzzle.locator(".hint-word:not([disabled])").filter({ hasText: word }).first();
    await button.click();
    await expect(button).toBeDisabled();
  };

  for (const word of ["SELECT", "id,", "name,", "age", "FROM", "users", "WHERE", "age", ">=", "20;"]) {
    await clickWord(word);
  }

  await page.locator(".xterm-helper-textarea").click();
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("judge-result")).toContainText("○");
  await expect(page.getByTestId("result-table")).toContainText("Alice");
  await expect(page.getByTestId("result-table")).toContainText("Carol");
});
```

- [ ] **Step 2: E2Eテストが通ることを確認する**

```bash
pnpm test:e2e
```

Expected: PASS（既存5テスト + 新規1テスト = 6 passed）

- [ ] **Step 3: `verify-web-ui`スキルで目視確認する**

`verify-web-ui`スキルの手順（`apps/web`でスタンドアロンdevサーバーを別ポートで起動し、Playwright MCPでスクリーンショット）に従い、以下を確認する:

1. 「ヒントを見る」→「もっとヒントを見る」の2段階が意図通り表示されること
2. 単語パズルのボタン群が読みやすく折り返し表示されること、クリックでdisabled状態になった見た目が分かること
3. ライト/ダーク/モバイル幅の3パターンで崩れがないこと

手順完了後、スクリーンショットとdevサーバーを必ずクリーンアップする（スキップ不可）。

- [ ] **Step 4: コミットする**

```bash
git add e2e
git commit -m "test(e2e): cover the hint word-puzzle flow"
```

---
