# 問題データの追加（WHERE/GROUP BY/JOIN） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `packages/problems`に5問（WHERE2・GROUPBY1・JOIN2）を追加し、計20問にする。

**Architecture:** 既存の1問1ファイルパターン（`<category>/NNN.json` + `NNN.test.ts`）をそのまま踏襲し、`packages/problems/index.ts`・`index.test.ts`・`README.md`を20問に対応させる。クエリ実行パイプラインの変更は不要。

**Tech Stack:** TypeScript, Vitest（既存構成のまま。新規依存パッケージなし）

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-08-10-more-problems-design.md`（承認済み）
- 新規5問のschema/seed/expectedResultは、設計書に記載のSQL例を実PGliteで実行し確認済みの値をそのまま使う（改変しない）
- GROUP BY問題でAVGは使わない（PGliteでNUMERIC型が文字列で返るため）
- `join/005.json`は`orderMatters: true`のため、`ORDER BY departments.name ASC, users.name ASC`のように第2ソートキー（`users.name`）を必ず指定し、同一部署内の行順を一意に確定させる（部署名だけでは同一部署内2人の順序がSQL上不定になるため）
- 対象外（本計画では実装しない）: サブクエリ・CTE・Window関数の問題、新カテゴリ、ORDERBYカテゴリへの追加、複数問題切り替えE2Eテストへの反映

---

### Task 1: packages/problems — 新規5問を追加する

**Files:**
- Create: `packages/problems/where/005.json`, `where/005.test.ts`
- Create: `packages/problems/where/006.json`, `where/006.test.ts`
- Create: `packages/problems/groupby/005.json`, `groupby/005.test.ts`
- Create: `packages/problems/join/004.json`, `join/004.test.ts`
- Create: `packages/problems/join/005.json`, `join/005.test.ts`
- Modify: `packages/problems/index.ts`
- Modify: `packages/problems/index.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `parseProblem`（`@sql-practice/shared`、既存、変更なし）
- Produces: `problems`配列（`packages/problems/index.ts`、20問。後続タスクなし — この機能はこのタスクで完結する）

- [ ] **Step 1: `packages/problems/where/005.json` を作成する**

```json
{
  "id": 16,
  "title": "AND演算子で複数条件を絞り込み",
  "difficulty": 1,
  "category": "WHERE",
  "question": "Engineering部署で、かつ25歳以上のユーザーを取得してください。",
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
  "hint": ["複数条件を組み合わせるにはANDを使います。", "dept列とage列、両方の条件を満たす行を探します。"],
  "answerQuery": "SELECT id, name, age, dept FROM users WHERE dept = 'Engineering' AND age >= 25;",
  "orderMatters": false
}
```

- [ ] **Step 2: `packages/problems/where/005.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("where/005.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./005.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(16);
    expect(problem.category).toBe("WHERE");
    expect(problem.answerQuery.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: `packages/problems/where/006.json` を作成する**

```json
{
  "id": 17,
  "title": "LIKE演算子で名前に特定の文字を含むユーザーを取得",
  "difficulty": 1,
  "category": "WHERE",
  "question": "名前に'e'を含むユーザーを取得してください。",
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
    { "id": 4, "name": "Dave", "age": 28, "dept": "Engineering" },
    { "id": 5, "name": "Eve", "age": 41, "dept": "Marketing" }
  ],
  "hint": ["LIKE演算子で文字列パターンにマッチする行を探せます。", "%は任意の文字列（0文字以上）を表すワイルドカードです。"],
  "answerQuery": "SELECT id, name, age, dept FROM users WHERE name LIKE '%e%';",
  "orderMatters": false
}
```

- [ ] **Step 4: `packages/problems/where/006.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("where/006.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./006.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(17);
    expect(problem.category).toBe("WHERE");
    expect(problem.answerQuery.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 5: `packages/problems/groupby/005.json` を作成する**

```json
{
  "id": 18,
  "title": "部署ごとの最年少年齢を取得",
  "difficulty": 3,
  "category": "GROUPBY",
  "question": "部署ごとの最年少年齢を取得してください。",
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
    { "dept": "Sales", "min_age": 18 },
    { "dept": "Engineering", "min_age": 28 },
    { "dept": "Marketing", "min_age": 19 }
  ],
  "hint": ["MIN()は最小値を求める集計関数です。", "GROUP BYと組み合わせて部署ごとの最小値を求めます。"],
  "answerQuery": "SELECT dept, MIN(age) FROM users GROUP BY dept;",
  "orderMatters": false
}
```

- [ ] **Step 6: `packages/problems/groupby/005.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("groupby/005.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./005.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(18);
    expect(problem.category).toBe("GROUPBY");
    expect(problem.answerQuery.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 7: `packages/problems/join/004.json` を作成する**

```json
{
  "id": 19,
  "title": "JOINとGROUP BYで部署ごとの人数を取得",
  "difficulty": 4,
  "category": "JOIN",
  "question": "部署ごとの人数を、部署名で取得してください。",
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
    { "dept_name": "Sales", "count": 2 },
    { "dept_name": "Engineering", "count": 2 },
    { "dept_name": "Marketing", "count": 2 }
  ],
  "hint": ["JOINとGROUP BYを組み合わせます。", "部署名（departments.name）でグループ化します。"],
  "answerQuery": "SELECT departments.name, COUNT(*) FROM users JOIN departments ON users.dept_id = departments.id GROUP BY departments.name;",
  "orderMatters": false
}
```

- [ ] **Step 8: `packages/problems/join/004.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("join/004.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./004.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(19);
    expect(problem.category).toBe("JOIN");
    expect(problem.answerQuery.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 9: `packages/problems/join/005.json` を作成する**

```json
{
  "id": 20,
  "title": "JOINと複数列ORDER BYで部署名昇順に取得",
  "difficulty": 4,
  "category": "JOIN",
  "question": "全ユーザーの名前と部署名を、部署名の昇順で、同じ部署内ではユーザー名の昇順に並べて取得してください。",
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
    { "user_name": "Carol", "dept_name": "Engineering" },
    { "user_name": "Dave", "dept_name": "Engineering" },
    { "user_name": "Eve", "dept_name": "Marketing" },
    { "user_name": "Frank", "dept_name": "Marketing" },
    { "user_name": "Alice", "dept_name": "Sales" },
    { "user_name": "Bob", "dept_name": "Sales" }
  ],
  "hint": ["JOINとORDER BYを組み合わせます。", "複数列を指定すると、最初の列が同じ場合に次の列で並べ替えます。"],
  "answerQuery": "SELECT users.name, departments.name FROM users JOIN departments ON users.dept_id = departments.id ORDER BY departments.name ASC, users.name ASC;",
  "orderMatters": true
}
```

- [ ] **Step 10: `packages/problems/join/005.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("join/005.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./005.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(20);
    expect(problem.category).toBe("JOIN");
    expect(problem.answerQuery.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 11: 失敗するテストを書く — `packages/problems/index.test.ts` を更新する**

現在のファイル全体を以下に置き換える:

```ts
import { describe, expect, it } from "vitest";
import { problems } from "./index";

describe("problems", () => {
  it("includes all seeded problems", () => {
    expect(problems).toHaveLength(20);
    expect(problems.map((p) => p.id).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
  });

  it("includes the original WHERE problem", () => {
    expect(problems.find((p) => p.id === 1)).toMatchObject({ id: 1, category: "WHERE" });
  });

  it("includes the WHERE problems", () => {
    expect(problems.find((p) => p.id === 2)).toMatchObject({ id: 2, category: "WHERE" });
    expect(problems.find((p) => p.id === 3)).toMatchObject({ id: 3, category: "WHERE" });
    expect(problems.find((p) => p.id === 10)).toMatchObject({ id: 10, category: "WHERE" });
    expect(problems.find((p) => p.id === 16)).toMatchObject({ id: 16, category: "WHERE" });
    expect(problems.find((p) => p.id === 17)).toMatchObject({ id: 17, category: "WHERE" });
  });

  it("includes the ORDERBY problems", () => {
    expect(problems.find((p) => p.id === 4)).toMatchObject({ id: 4, category: "ORDERBY" });
    expect(problems.find((p) => p.id === 5)).toMatchObject({ id: 5, category: "ORDERBY" });
    expect(problems.find((p) => p.id === 11)).toMatchObject({ id: 11, category: "ORDERBY" });
    expect(problems.find((p) => p.id === 12)).toMatchObject({ id: 12, category: "ORDERBY" });
  });

  it("includes the GROUPBY problems", () => {
    expect(problems.find((p) => p.id === 6)).toMatchObject({ id: 6, category: "GROUPBY" });
    expect(problems.find((p) => p.id === 7)).toMatchObject({ id: 7, category: "GROUPBY" });
    expect(problems.find((p) => p.id === 13)).toMatchObject({ id: 13, category: "GROUPBY" });
    expect(problems.find((p) => p.id === 14)).toMatchObject({ id: 14, category: "GROUPBY" });
    expect(problems.find((p) => p.id === 18)).toMatchObject({ id: 18, category: "GROUPBY" });
  });

  it("includes the JOIN problems", () => {
    expect(problems.find((p) => p.id === 8)).toMatchObject({ id: 8, category: "JOIN" });
    expect(problems.find((p) => p.id === 9)).toMatchObject({ id: 9, category: "JOIN" });
    expect(problems.find((p) => p.id === 15)).toMatchObject({ id: 15, category: "JOIN" });
    expect(problems.find((p) => p.id === 19)).toMatchObject({ id: 19, category: "JOIN" });
    expect(problems.find((p) => p.id === 20)).toMatchObject({ id: 20, category: "JOIN" });
  });
});
```

- [ ] **Step 12: テストが失敗することを確認する**

Run: `npx vitest run packages/problems/index.test.ts`
Expected: FAIL — `expect(problems).toHaveLength(20)`などが失敗する（`index.ts`がまだ新規5問をimport/exportしていないため、`problems`配列は15件のまま）

- [ ] **Step 13: `packages/problems/index.ts` を更新する**

現在のファイル全体を以下に置き換える:

```ts
import { parseProblem, type Problem } from "@sql-practice/shared";
import where001 from "./where/001.json";
import where002 from "./where/002.json";
import where003 from "./where/003.json";
import where004 from "./where/004.json";
import where005 from "./where/005.json";
import where006 from "./where/006.json";
import orderby001 from "./orderby/001.json";
import orderby002 from "./orderby/002.json";
import orderby003 from "./orderby/003.json";
import orderby004 from "./orderby/004.json";
import groupby001 from "./groupby/001.json";
import groupby002 from "./groupby/002.json";
import groupby003 from "./groupby/003.json";
import groupby004 from "./groupby/004.json";
import groupby005 from "./groupby/005.json";
import join001 from "./join/001.json";
import join002 from "./join/002.json";
import join003 from "./join/003.json";
import join004 from "./join/004.json";
import join005 from "./join/005.json";

export const problems: Problem[] = [
  where001,
  where002,
  where003,
  where004,
  where005,
  where006,
  orderby001,
  orderby002,
  orderby003,
  orderby004,
  groupby001,
  groupby002,
  groupby003,
  groupby004,
  groupby005,
  join001,
  join002,
  join003,
  join004,
  join005,
].map(parseProblem);
```

- [ ] **Step 14: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS（全テストファイル。`apps/api`側のテストは`id === 1`の存在しか見ていないため影響を受けない）

- [ ] **Step 15: `README.md`を更新する**

現在の以下の行を:

```
- カテゴリ: WHERE / ORDER BY / GROUP BY / JOIN（全15問）
```

以下に置き換える:

```
- カテゴリ: WHERE / ORDER BY / GROUP BY / JOIN（全20問）
```

- [ ] **Step 16: ビルドが通ることを確認する**

```bash
pnpm build
```

Expected: 成功

- [ ] **Step 17: E2Eテストが通ることを確認する**

```bash
pnpm test:e2e
```

Expected: PASS（既存E2Eは問題1・2に固定されているため、今回の追加による影響はないはずだが回帰がないことを確認する）

- [ ] **Step 18: lintが通ることを確認する**

```bash
pnpm lint
```

Expected: エラーなし

- [ ] **Step 19: コミットする**

```bash
git add packages/problems README.md
git commit -m "feat: add 5 more WHERE/GROUP BY/JOIN problems"
```

---
