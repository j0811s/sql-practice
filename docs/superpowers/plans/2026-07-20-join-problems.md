# JOIN問題データとクエリパイプライン修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** クエリ実行パイプラインの同名列バグを修正し、JOIN問題を2問追加する。

**Architecture:** PGliteの`rowMode: "array"`オプションを使うよう`apps/web/src/db/pglite.ts`・`queryResult.ts`を修正した上で、`packages/problems`にJOIN問題2問を追加し`index.ts`を9問に対応させる。

**Tech Stack:** TypeScript, Vitest（既存構成のまま。新規依存パッケージなし）

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-07-20-join-problems-design.md`（承認済み）
- `runQuery`は`db.query(sql, [], { rowMode: "array" })`を使う（列名キーのオブジェクトではなく、位置ベースの配列で行を受け取る）
- 既存7問すべてが、修正後のパイプラインでも`judge()`が真になること（既に実PGliteで検証済み、回帰なし）
- JOIN問題用のテーブル定義・シードデータは既存の問題とは独立させる（他の問題に影響しない）
- 対象外（本計画では実装しない）: サブクエリ・CTE・Window関数の問題、複数問題切り替えE2EテストへのJOIN問題の追加

---

### Task 1: apps/web/src/db — クエリ実行パイプラインの同名列バグを修正する

**Files:**
- Modify: `apps/web/src/db/queryResult.ts`
- Modify: `apps/web/src/db/queryResult.test.ts`
- Modify: `apps/web/src/db/pglite.ts`
- Modify: `apps/web/src/db/pglite.test.ts`

**Interfaces:**
- Consumes: なし（既存の`TableResult`型・`PGlite`のみ）
- Produces: `toTableResult`・`runQuery`の挙動変更（Task 2のJOIN問題が依存する）。公開シグネチャ（`runQuery(db, sql): Promise<TableResult>`）は変更しない

- [ ] **Step 1: 失敗するテストを書く — `apps/web/src/db/queryResult.test.ts`**

現在のファイル全体を以下に置き換える:

```ts
import { describe, expect, it } from "vitest";
import { toTableResult } from "./queryResult";

describe("toTableResult", () => {
  it("converts field/row arrays into a column-ordered table", () => {
    const result = toTableResult({
      fields: [{ name: "id" }, { name: "name" }, { name: "age" }],
      rows: [
        [1, "Alice", 22],
        [3, "Carol", 35],
      ],
    });

    expect(result).toEqual({
      columns: ["id", "name", "age"],
      rows: [
        [1, "Alice", 22],
        [3, "Carol", 35],
      ],
    });
  });

  it("preserves both values when two columns share the same name", () => {
    const result = toTableResult({
      fields: [{ name: "name" }, { name: "name" }],
      rows: [["Alice", "Sales"]],
    });

    expect(result).toEqual({
      columns: ["name", "name"],
      rows: [["Alice", "Sales"]],
    });
  });
});
```

- [ ] **Step 2: `apps/web/src/db/pglite.test.ts` に失敗するテストを追加する**

現在のファイル全体を以下に置き換える（既存のテストケースはそのまま、新しいテストケースを追加する）:

```ts
import { describe, expect, it } from "vitest";
import { createDb, runQuery } from "./pglite";

describe("runQuery", () => {
  it("executes SQL against a real PGlite instance and returns table rows", async () => {
    const db = await createDb();
    await db.exec("CREATE TABLE users(id INTEGER,name TEXT,age INTEGER);");
    await db.exec("INSERT INTO users VALUES(1,'Alice',22);");
    await db.exec("INSERT INTO users VALUES(2,'Bob',18);");
    await db.exec("INSERT INTO users VALUES(3,'Carol',35);");

    const result = await runQuery(db, "SELECT id, name, age FROM users WHERE age >= 20;");

    expect(result).toEqual({
      columns: ["id", "name", "age"],
      rows: [
        [1, "Alice", 22],
        [3, "Carol", 35],
      ],
    });
  });

  it("preserves distinct values when two selected columns share the same name", async () => {
    const db = await createDb();
    await db.exec("CREATE TABLE departments(id INTEGER, name TEXT);");
    await db.exec("CREATE TABLE users(id INTEGER, name TEXT, dept_id INTEGER);");
    await db.exec("INSERT INTO departments VALUES(1,'Sales');");
    await db.exec("INSERT INTO users VALUES(1,'Alice',1);");

    const result = await runQuery(
      db,
      "SELECT users.name, departments.name FROM users JOIN departments ON users.dept_id = departments.id;",
    );

    expect(result).toEqual({
      columns: ["name", "name"],
      rows: [["Alice", "Sales"]],
    });
  });
});
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — `apps/web/src/db/queryResult.test.ts`の新しいテストケースと、`apps/web/src/db/pglite.test.ts`の新しいテストケースの両方が失敗する（既存の実装がまだ列名ベースのルックアップ・オブジェクト形式の行を前提としているため）

- [ ] **Step 4: `apps/web/src/db/queryResult.ts` を修正する**

現在のファイル全体を以下に置き換える:

```ts
export interface TableResult {
  columns: string[];
  rows: unknown[][];
}

interface RawQueryResult {
  fields: { name: string }[];
  rows: unknown[][];
}

export function toTableResult(result: RawQueryResult): TableResult {
  const columns = result.fields.map((field) => field.name);
  return { columns, rows: result.rows };
}
```

- [ ] **Step 5: `apps/web/src/db/pglite.ts` を修正する**

現在のファイル全体を以下に置き換える:

```ts
import { PGlite } from "@electric-sql/pglite";
import { toTableResult, type TableResult } from "./queryResult";

export async function createDb(): Promise<PGlite> {
  return new PGlite();
}

export async function runQuery(db: PGlite, sql: string): Promise<TableResult> {
  const result = await db.query<unknown[]>(sql, [], { rowMode: "array" });
  return toTableResult(result);
}
```

- [ ] **Step 6: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS（全テストファイル。既存の7問すべての正誤判定を含め、リグレッションがないことを確認する）

- [ ] **Step 7: ビルドが通ることを確認する**

```bash
pnpm build
```

Expected: 成功

- [ ] **Step 8: コミットする**

```bash
git add apps/web/src/db
git commit -m "fix: preserve duplicate column names in query results"
```

---

### Task 2: packages/problems — JOIN問題を2問追加する

**Files:**
- Create: `packages/problems/join/001.json`
- Create: `packages/problems/join/001.test.ts`
- Create: `packages/problems/join/002.json`
- Create: `packages/problems/join/002.test.ts`
- Modify: `packages/problems/index.ts`
- Modify: `packages/problems/index.test.ts`

**Interfaces:**
- Consumes: `parseProblem`（`@sql-practice/shared`、既存）、Task 1で修正済みのクエリ実行パイプライン
- Produces: `problems`配列（`packages/problems/index.ts`、9問）

- [ ] **Step 1: `packages/problems/join/001.json` を作成する**

```json
{
  "id": 8,
  "title": "ユーザーと部署名を結合して取得",
  "difficulty": 4,
  "category": "JOIN",
  "question": "全ユーザーの名前と所属部署名を取得してください。",
  "schema": [
    "CREATE TABLE departments(id INTEGER, name TEXT);",
    "CREATE TABLE users(id INTEGER, name TEXT, age INTEGER, dept_id INTEGER);"
  ],
  "seed": [
    "INSERT INTO departments VALUES(1,'Sales');",
    "INSERT INTO departments VALUES(2,'Engineering');",
    "INSERT INTO departments VALUES(3,'Marketing');",
    "INSERT INTO users VALUES(1,'Alice',22,1);",
    "INSERT INTO users VALUES(2,'Bob',18,1);",
    "INSERT INTO users VALUES(3,'Carol',35,2);",
    "INSERT INTO users VALUES(4,'Dave',28,2);",
    "INSERT INTO users VALUES(5,'Eve',41,3);",
    "INSERT INTO users VALUES(6,'Frank',19,3);"
  ],
  "expectedResult": [
    { "user_name": "Alice", "dept_name": "Sales" },
    { "user_name": "Bob", "dept_name": "Sales" },
    { "user_name": "Carol", "dept_name": "Engineering" },
    { "user_name": "Dave", "dept_name": "Engineering" },
    { "user_name": "Eve", "dept_name": "Marketing" },
    { "user_name": "Frank", "dept_name": "Marketing" }
  ],
  "hint": ["JOIN句を使って2つのテーブルを結合します。", "ON句でusers.dept_idとdepartments.idを一致させます。"],
  "orderMatters": false
}
```

- [ ] **Step 2: `packages/problems/join/001.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("join/001.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./001.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(8);
    expect(problem.category).toBe("JOIN");
  });
});
```

- [ ] **Step 3: `packages/problems/join/002.json` を作成する**

```json
{
  "id": 9,
  "title": "Marketing部署のユーザー名を結合して取得",
  "difficulty": 4,
  "category": "JOIN",
  "question": "Marketing部署に所属するユーザーの名前を取得してください。",
  "schema": [
    "CREATE TABLE departments(id INTEGER, name TEXT);",
    "CREATE TABLE users(id INTEGER, name TEXT, age INTEGER, dept_id INTEGER);"
  ],
  "seed": [
    "INSERT INTO departments VALUES(1,'Sales');",
    "INSERT INTO departments VALUES(2,'Engineering');",
    "INSERT INTO departments VALUES(3,'Marketing');",
    "INSERT INTO users VALUES(1,'Alice',22,1);",
    "INSERT INTO users VALUES(2,'Bob',18,1);",
    "INSERT INTO users VALUES(3,'Carol',35,2);",
    "INSERT INTO users VALUES(4,'Dave',28,2);",
    "INSERT INTO users VALUES(5,'Eve',41,3);",
    "INSERT INTO users VALUES(6,'Frank',19,3);"
  ],
  "expectedResult": [
    { "name": "Eve" },
    { "name": "Frank" }
  ],
  "hint": ["JOIN句とWHERE句を組み合わせます。", "departments.nameで部署名を絞り込みます。"],
  "orderMatters": false
}
```

- [ ] **Step 4: `packages/problems/join/002.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("join/002.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./002.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(9);
    expect(problem.category).toBe("JOIN");
  });
});
```

- [ ] **Step 5: 失敗するテストを書く — `packages/problems/index.test.ts` を更新する**

現在のファイル全体を以下に置き換える:

```ts
import { describe, expect, it } from "vitest";
import { problems } from "./index";

describe("problems", () => {
  it("includes all seeded problems", () => {
    expect(problems).toHaveLength(9);
    expect(problems.map((p) => p.id).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
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

  it("includes the JOIN problems", () => {
    expect(problems.find((p) => p.id === 8)).toMatchObject({ id: 8, category: "JOIN" });
    expect(problems.find((p) => p.id === 9)).toMatchObject({ id: 9, category: "JOIN" });
  });
});
```

- [ ] **Step 6: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — `packages/problems/index.test.ts` が失敗する（`index.ts` がまだ9問を返さないため）

- [ ] **Step 7: `packages/problems/index.ts` を更新する**

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
import join001 from "./join/001.json";
import join002 from "./join/002.json";

export const problems: Problem[] = [
  where001,
  where002,
  where003,
  orderby001,
  orderby002,
  groupby001,
  groupby002,
  join001,
  join002,
].map(parseProblem);
```

- [ ] **Step 8: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS（全テストファイル）

- [ ] **Step 9: ビルドが通ることを確認する**

```bash
pnpm build
```

Expected: 成功

- [ ] **Step 10: コミットする**

```bash
git add packages/problems
git commit -m "feat: add JOIN problem data"
```

---
