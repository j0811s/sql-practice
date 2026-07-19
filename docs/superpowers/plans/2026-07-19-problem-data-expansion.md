# 問題データの拡充（WHERE/ORDER BY/GROUP BY） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `packages/problems` にWHERE・ORDER BY・GROUP BYの問題を各2問追加し、計7問にする。

**Architecture:** 既存の1問1ファイルパターン（`where/001.json` + `001.test.ts`）を踏襲し、6つの新規問題ファイル・テストファイルを追加した上で、`packages/problems/index.ts`・`index.test.ts` を7問に対応させる。

**Tech Stack:** JSON, TypeScript, Vitest（既存構成のまま。新規依存パッケージなし）

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-07-19-problem-data-expansion-design.md`（承認済み）
- 既存の `packages/problems/where/001.json` は変更しない
- 新規6問はすべて同じテーブル定義・シードデータ（`users(id,name,age,dept)`、6行）を使う
- 全ての `expectedResult` は実PGliteでSQLを実行して得られた値と一致すること（設計書に記載済みの検証済み値をそのまま使う）
- GROUP BY問題では `AVG` を使わない（PGliteがNUMERIC型を文字列で返すため、素直な数値の`expectedResult`と一致しない）
- 対象外（本計画では実装しない）: JOIN・サブクエリ・CTE・Window関数の問題、複数問題選択UIの切り替えE2Eテスト、`apps/api`との連携確認

---

### Task 1: packages/problems — WHERE/ORDER BY/GROUP BY問題を各2問追加する

**Files:**
- Create: `packages/problems/where/002.json`
- Create: `packages/problems/where/002.test.ts`
- Create: `packages/problems/where/003.json`
- Create: `packages/problems/where/003.test.ts`
- Create: `packages/problems/orderby/001.json`
- Create: `packages/problems/orderby/001.test.ts`
- Create: `packages/problems/orderby/002.json`
- Create: `packages/problems/orderby/002.test.ts`
- Create: `packages/problems/groupby/001.json`
- Create: `packages/problems/groupby/001.test.ts`
- Create: `packages/problems/groupby/002.json`
- Create: `packages/problems/groupby/002.test.ts`
- Modify: `packages/problems/index.ts`
- Modify: `packages/problems/index.test.ts`

**Interfaces:**
- Consumes: `parseProblem`（`@sql-practice/shared`、既存）
- Produces: `problems`配列（`packages/problems/index.ts`、7問。Task完了後、後続タスクの`apps/web`が消費する）

- [ ] **Step 1: `packages/problems/where/002.json` を作成する**

```json
{
  "id": 2,
  "title": "Engineering部署のユーザーを取得",
  "difficulty": 1,
  "category": "WHERE",
  "question": "Engineeringの部署のユーザーを取得してください。",
  "schema": ["CREATE TABLE users(id INTEGER,name TEXT,age INTEGER,dept TEXT);"],
  "seed": [
    "INSERT INTO users VALUES(1,'Alice',22,'Sales');",
    "INSERT INTO users VALUES(2,'Bob',18,'Sales');",
    "INSERT INTO users VALUES(3,'Carol',35,'Engineering');",
    "INSERT INTO users VALUES(4,'Dave',28,'Engineering');",
    "INSERT INTO users VALUES(5,'Eve',41,'Marketing');",
    "INSERT INTO users VALUES(6,'Frank',19,'Marketing');"
  ],
  "expectedResult": [
    { "id": 3, "name": "Carol", "age": 35, "dept": "Engineering" },
    { "id": 4, "name": "Dave", "age": 28, "dept": "Engineering" }
  ],
  "hint": ["WHERE句で文字列を比較する際は引用符で囲みます。", "dept列の値を確認してみましょう。"],
  "orderMatters": false
}
```

- [ ] **Step 2: `packages/problems/where/002.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("where/002.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./002.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(2);
    expect(problem.category).toBe("WHERE");
  });
});
```

- [ ] **Step 3: `packages/problems/where/003.json` を作成する**

```json
{
  "id": 3,
  "title": "30歳未満のユーザーを取得",
  "difficulty": 1,
  "category": "WHERE",
  "question": "30歳未満のユーザーを取得してください。",
  "schema": ["CREATE TABLE users(id INTEGER,name TEXT,age INTEGER,dept TEXT);"],
  "seed": [
    "INSERT INTO users VALUES(1,'Alice',22,'Sales');",
    "INSERT INTO users VALUES(2,'Bob',18,'Sales');",
    "INSERT INTO users VALUES(3,'Carol',35,'Engineering');",
    "INSERT INTO users VALUES(4,'Dave',28,'Engineering');",
    "INSERT INTO users VALUES(5,'Eve',41,'Marketing');",
    "INSERT INTO users VALUES(6,'Frank',19,'Marketing');"
  ],
  "expectedResult": [
    { "id": 1, "name": "Alice", "age": 22, "dept": "Sales" },
    { "id": 2, "name": "Bob", "age": 18, "dept": "Sales" },
    { "id": 4, "name": "Dave", "age": 28, "dept": "Engineering" },
    { "id": 6, "name": "Frank", "age": 19, "dept": "Marketing" }
  ],
  "hint": ["WHERE句を使います。", "『未満』なので比較演算子を確認してみましょう。"],
  "orderMatters": false
}
```

- [ ] **Step 4: `packages/problems/where/003.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("where/003.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./003.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(3);
    expect(problem.category).toBe("WHERE");
  });
});
```

- [ ] **Step 5: `packages/problems/orderby/001.json` を作成する**

```json
{
  "id": 4,
  "title": "年齢の若い順に並べ替え",
  "difficulty": 2,
  "category": "ORDERBY",
  "question": "全ユーザーを年齢の若い順に並べて取得してください。",
  "schema": ["CREATE TABLE users(id INTEGER,name TEXT,age INTEGER,dept TEXT);"],
  "seed": [
    "INSERT INTO users VALUES(1,'Alice',22,'Sales');",
    "INSERT INTO users VALUES(2,'Bob',18,'Sales');",
    "INSERT INTO users VALUES(3,'Carol',35,'Engineering');",
    "INSERT INTO users VALUES(4,'Dave',28,'Engineering');",
    "INSERT INTO users VALUES(5,'Eve',41,'Marketing');",
    "INSERT INTO users VALUES(6,'Frank',19,'Marketing');"
  ],
  "expectedResult": [
    { "id": 2, "name": "Bob", "age": 18, "dept": "Sales" },
    { "id": 6, "name": "Frank", "age": 19, "dept": "Marketing" },
    { "id": 1, "name": "Alice", "age": 22, "dept": "Sales" },
    { "id": 4, "name": "Dave", "age": 28, "dept": "Engineering" },
    { "id": 3, "name": "Carol", "age": 35, "dept": "Engineering" },
    { "id": 5, "name": "Eve", "age": 41, "dept": "Marketing" }
  ],
  "hint": ["ORDER BY句を使います。", "昇順はASC（省略可能）です。"],
  "orderMatters": true
}
```

- [ ] **Step 6: `packages/problems/orderby/001.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("orderby/001.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./001.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(4);
    expect(problem.category).toBe("ORDERBY");
  });
});
```

- [ ] **Step 7: `packages/problems/orderby/002.json` を作成する**

```json
{
  "id": 5,
  "title": "年齢の高い順に並べ替え",
  "difficulty": 2,
  "category": "ORDERBY",
  "question": "全ユーザーを年齢の高い順に並べて取得してください。",
  "schema": ["CREATE TABLE users(id INTEGER,name TEXT,age INTEGER,dept TEXT);"],
  "seed": [
    "INSERT INTO users VALUES(1,'Alice',22,'Sales');",
    "INSERT INTO users VALUES(2,'Bob',18,'Sales');",
    "INSERT INTO users VALUES(3,'Carol',35,'Engineering');",
    "INSERT INTO users VALUES(4,'Dave',28,'Engineering');",
    "INSERT INTO users VALUES(5,'Eve',41,'Marketing');",
    "INSERT INTO users VALUES(6,'Frank',19,'Marketing');"
  ],
  "expectedResult": [
    { "id": 5, "name": "Eve", "age": 41, "dept": "Marketing" },
    { "id": 3, "name": "Carol", "age": 35, "dept": "Engineering" },
    { "id": 4, "name": "Dave", "age": 28, "dept": "Engineering" },
    { "id": 1, "name": "Alice", "age": 22, "dept": "Sales" },
    { "id": 6, "name": "Frank", "age": 19, "dept": "Marketing" },
    { "id": 2, "name": "Bob", "age": 18, "dept": "Sales" }
  ],
  "hint": ["ORDER BY句を使います。", "降順はDESCを指定します。"],
  "orderMatters": true
}
```

- [ ] **Step 8: `packages/problems/orderby/002.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("orderby/002.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./002.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(5);
    expect(problem.category).toBe("ORDERBY");
  });
});
```

- [ ] **Step 9: `packages/problems/groupby/001.json` を作成する**

```json
{
  "id": 6,
  "title": "部署ごとの人数を集計",
  "difficulty": 3,
  "category": "GROUPBY",
  "question": "部署ごとの人数を取得してください。",
  "schema": ["CREATE TABLE users(id INTEGER,name TEXT,age INTEGER,dept TEXT);"],
  "seed": [
    "INSERT INTO users VALUES(1,'Alice',22,'Sales');",
    "INSERT INTO users VALUES(2,'Bob',18,'Sales');",
    "INSERT INTO users VALUES(3,'Carol',35,'Engineering');",
    "INSERT INTO users VALUES(4,'Dave',28,'Engineering');",
    "INSERT INTO users VALUES(5,'Eve',41,'Marketing');",
    "INSERT INTO users VALUES(6,'Frank',19,'Marketing');"
  ],
  "expectedResult": [
    { "dept": "Sales", "count": 2 },
    { "dept": "Engineering", "count": 2 },
    { "dept": "Marketing", "count": 2 }
  ],
  "hint": ["GROUP BY句を使います。", "件数を数えるにはCOUNT(*)を使います。"],
  "orderMatters": false
}
```

- [ ] **Step 10: `packages/problems/groupby/001.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("groupby/001.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./001.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(6);
    expect(problem.category).toBe("GROUPBY");
  });
});
```

- [ ] **Step 11: `packages/problems/groupby/002.json` を作成する**

```json
{
  "id": 7,
  "title": "部署ごとの年齢合計を集計",
  "difficulty": 3,
  "category": "GROUPBY",
  "question": "部署ごとの年齢合計を取得してください。",
  "schema": ["CREATE TABLE users(id INTEGER,name TEXT,age INTEGER,dept TEXT);"],
  "seed": [
    "INSERT INTO users VALUES(1,'Alice',22,'Sales');",
    "INSERT INTO users VALUES(2,'Bob',18,'Sales');",
    "INSERT INTO users VALUES(3,'Carol',35,'Engineering');",
    "INSERT INTO users VALUES(4,'Dave',28,'Engineering');",
    "INSERT INTO users VALUES(5,'Eve',41,'Marketing');",
    "INSERT INTO users VALUES(6,'Frank',19,'Marketing');"
  ],
  "expectedResult": [
    { "dept": "Sales", "total_age": 40 },
    { "dept": "Engineering", "total_age": 63 },
    { "dept": "Marketing", "total_age": 60 }
  ],
  "hint": ["GROUP BY句を使います。", "合計を求めるにはSUM()を使います。"],
  "orderMatters": false
}
```

- [ ] **Step 12: `packages/problems/groupby/002.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("groupby/002.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./002.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(7);
    expect(problem.category).toBe("GROUPBY");
  });
});
```

- [ ] **Step 13: 失敗するテストを書く — `packages/problems/index.test.ts` を更新する**

現在のファイル全体を以下に置き換える:

```ts
import { describe, expect, it } from "vitest";
import { problems } from "./index";

describe("problems", () => {
  it("includes all seeded problems", () => {
    expect(problems).toHaveLength(7);
    expect(problems.map((p) => p.id).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("includes the original WHERE problem", () => {
    expect(problems.find((p) => p.id === 1)).toMatchObject({ id: 1, category: "WHERE" });
  });

  it("includes the new WHERE problems", () => {
    expect(problems.find((p) => p.id === 2)).toMatchObject({ id: 2, category: "WHERE" });
    expect(problems.find((p) => p.id === 3)).toMatchObject({ id: 3, category: "WHERE" });
  });

  it("includes the ORDERBY problems", () => {
    expect(problems.find((p) => p.id === 4)).toMatchObject({ id: 4, category: "ORDERBY" });
    expect(problems.find((p) => p.id === 5)).toMatchObject({ id: 5, category: "ORDERBY" });
  });

  it("includes the GROUPBY problems", () => {
    expect(problems.find((p) => p.id === 6)).toMatchObject({ id: 6, category: "GROUPBY" });
    expect(problems.find((p) => p.id === 7)).toMatchObject({ id: 7, category: "GROUPBY" });
  });
});
```

- [ ] **Step 14: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — `packages/problems/index.test.ts` が失敗する（`index.ts` がまだ7問を返さないため。`problems` の length が1のままで `toHaveLength(7)` を満たさない）

- [ ] **Step 15: `packages/problems/index.ts` を更新する**

現在のファイル全体を以下に置き換える:

```ts
import { parseProblem, type Problem } from "@sql-practice/shared";
import where001 from "./where/001.json";
import where002 from "./where/002.json";
import where003 from "./where/003.json";
import orderby001 from "./orderby/001.json";
import orderby002 from "./orderby/002.json";
import groupby001 from "./groupby/001.json";
import groupby002 from "./groupby/002.json";

export const problems: Problem[] = [
  where001,
  where002,
  where003,
  orderby001,
  orderby002,
  groupby001,
  groupby002,
].map(parseProblem);
```

- [ ] **Step 16: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS（全テストファイル）

- [ ] **Step 17: `apps/web` のビルドが通ることを確認する**

```bash
pnpm build
```

Expected: 成功（`packages/problems`が増えたことで`apps/web`のバンドルに問題が生じないことを確認する）

- [ ] **Step 18: コミットする**

```bash
git add packages/problems
git commit -m "feat: add WHERE/ORDER BY/GROUP BY problem data"
```

---
