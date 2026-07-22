# 問題データの追加拡充（WHERE/ORDER BY/GROUP BY/JOIN） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `packages/problems`に6問（WHERE1・ORDERBY2・GROUPBY2・JOIN1）を追加し、計15問にする。

**Architecture:** 既存の1問1ファイルパターン（`<category>/NNN.json` + `NNN.test.ts`）をそのまま踏襲し、`packages/problems/index.ts`・`index.test.ts`・`README.md`を15問に対応させる。クエリ実行パイプラインの変更は不要。

**Tech Stack:** TypeScript, Vitest（既存構成のまま。新規依存パッケージなし）

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-07-22-additional-problems-design.md`（承認済み）
- 新規6問のschema/seed/expectedResultは、設計書に記載のSQL例を実PGliteで実行し確認済みの値をそのまま使う（改変しない）
- `groupby/003.json`と`join/003.json`は専用の独立したシードを使う（既存問題のシードには影響しない）
- GROUP BY問題でAVGは使わない（PGliteでNUMERIC型が文字列で返るため。`docs/superpowers/specs/2026-07-19-problem-data-expansion-design.md`参照）
- 対象外（本計画では実装しない）: サブクエリ・CTE・Window関数の問題、新カテゴリ、複数問題切り替えE2Eテストへの反映

---

### Task 1: packages/problems — 新規6問を追加する

**Files:**
- Create: `packages/problems/where/004.json`, `where/004.test.ts`
- Create: `packages/problems/orderby/003.json`, `orderby/003.test.ts`
- Create: `packages/problems/orderby/004.json`, `orderby/004.test.ts`
- Create: `packages/problems/groupby/003.json`, `groupby/003.test.ts`
- Create: `packages/problems/groupby/004.json`, `groupby/004.test.ts`
- Create: `packages/problems/join/003.json`, `join/003.test.ts`
- Modify: `packages/problems/index.ts`
- Modify: `packages/problems/index.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `parseProblem`（`@sql-practice/shared`、既存）
- Produces: `problems`配列（`packages/problems/index.ts`、15問）

- [ ] **Step 1: `packages/problems/where/004.json` を作成する**

```json
{
  "id": 10,
  "title": "IN演算子で複数部署のユーザーを取得",
  "difficulty": 1,
  "category": "WHERE",
  "question": "SalesまたはMarketing部署のユーザーを取得してください。",
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
    { "id": 5, "name": "Eve", "age": 41, "dept": "Marketing" },
    { "id": 6, "name": "Frank", "age": 19, "dept": "Marketing" }
  ],
  "hint": ["IN演算子は複数の値のいずれかに一致する行を取得します。", "WHERE dept IN ('Sales', 'Marketing') のように書きます。"],
  "orderMatters": false
}
```

- [ ] **Step 2: `packages/problems/where/004.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("where/004.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./004.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(10);
    expect(problem.category).toBe("WHERE");
  });
});
```

- [ ] **Step 3: `packages/problems/orderby/003.json` を作成する**

```json
{
  "id": 11,
  "title": "年齢が高い上位3人を取得",
  "difficulty": 2,
  "category": "ORDERBY",
  "question": "年齢が高い上位3人のユーザーを取得してください（年齢の高い順）。",
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
    { "id": 4, "name": "Dave", "age": 28, "dept": "Engineering" }
  ],
  "hint": ["ORDER BYで並べ替えた後、LIMITで件数を絞り込めます。", "上位3件なのでLIMIT 3を指定します。"],
  "orderMatters": true
}
```

- [ ] **Step 4: `packages/problems/orderby/003.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("orderby/003.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./003.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(11);
    expect(problem.category).toBe("ORDERBY");
  });
});
```

- [ ] **Step 5: `packages/problems/orderby/004.json` を作成する**

```json
{
  "id": 12,
  "title": "部署昇順・年齢降順で並べ替え",
  "difficulty": 2,
  "category": "ORDERBY",
  "question": "部署名の昇順で、同じ部署内では年齢の高い順に並べて取得してください。",
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
    { "id": 4, "name": "Dave", "age": 28, "dept": "Engineering" },
    { "id": 5, "name": "Eve", "age": 41, "dept": "Marketing" },
    { "id": 6, "name": "Frank", "age": 19, "dept": "Marketing" },
    { "id": 1, "name": "Alice", "age": 22, "dept": "Sales" },
    { "id": 2, "name": "Bob", "age": 18, "dept": "Sales" }
  ],
  "hint": ["ORDER BYには複数の列をカンマ区切りで指定できます。", "部署名は昇順（ASC）、年齢は降順（DESC）にします。"],
  "orderMatters": true
}
```

- [ ] **Step 6: `packages/problems/orderby/004.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("orderby/004.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./004.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(12);
    expect(problem.category).toBe("ORDERBY");
  });
});
```

- [ ] **Step 7: `packages/problems/groupby/003.json` を作成する**

```json
{
  "id": 13,
  "title": "所属人数が3人以上の部署を取得",
  "difficulty": 3,
  "category": "GROUPBY",
  "question": "所属人数が3人以上の部署を取得してください。",
  "schema": ["CREATE TABLE users(id INTEGER,name TEXT,age INTEGER,dept TEXT);"],
  "seed": [
    "INSERT INTO users VALUES(1,'Alice',22,'Sales');",
    "INSERT INTO users VALUES(2,'Bob',18,'Sales');",
    "INSERT INTO users VALUES(3,'Carol',35,'Engineering');",
    "INSERT INTO users VALUES(4,'Dave',28,'Engineering');",
    "INSERT INTO users VALUES(5,'Eve',41,'Marketing');",
    "INSERT INTO users VALUES(6,'Frank',19,'Marketing');",
    "INSERT INTO users VALUES(7,'Grace',30,'Sales');",
    "INSERT INTO users VALUES(8,'Heidi',26,'Engineering');"
  ],
  "expectedResult": [
    { "dept": "Sales", "count": 3 },
    { "dept": "Engineering", "count": 3 }
  ],
  "hint": ["HAVING句はGROUP BYでまとめた後の集計結果に条件を指定します。", "人数を数えるにはCOUNT(*)を使います。"],
  "orderMatters": false
}
```

- [ ] **Step 8: `packages/problems/groupby/003.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("groupby/003.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./003.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(13);
    expect(problem.category).toBe("GROUPBY");
  });
});
```

- [ ] **Step 9: `packages/problems/groupby/004.json` を作成する**

```json
{
  "id": 14,
  "title": "部署ごとの最高年齢を取得",
  "difficulty": 3,
  "category": "GROUPBY",
  "question": "部署ごとの最高年齢を取得してください。",
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
    { "dept": "Sales", "max_age": 22 },
    { "dept": "Engineering", "max_age": 35 },
    { "dept": "Marketing", "max_age": 41 }
  ],
  "hint": ["MAX()は最大値を求める集計関数です。", "GROUP BYと組み合わせて部署ごとの最大値を求めます。"],
  "orderMatters": false
}
```

- [ ] **Step 10: `packages/problems/groupby/004.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("groupby/004.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./004.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(14);
    expect(problem.category).toBe("GROUPBY");
  });
});
```

- [ ] **Step 11: `packages/problems/join/003.json` を作成する**

```json
{
  "id": 15,
  "title": "LEFT JOINで部署未所属も含めて取得",
  "difficulty": 4,
  "category": "JOIN",
  "question": "部署に所属していないユーザーも含めて、全ユーザーの名前と部署名を取得してください（部署未所属の場合は部署名がNULLになります）。",
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
    "INSERT INTO users VALUES(6,'Frank',19,3);",
    "INSERT INTO users VALUES(7,'Grace',24,NULL);"
  ],
  "expectedResult": [
    { "user_name": "Alice", "dept_name": "Sales" },
    { "user_name": "Bob", "dept_name": "Sales" },
    { "user_name": "Carol", "dept_name": "Engineering" },
    { "user_name": "Dave", "dept_name": "Engineering" },
    { "user_name": "Eve", "dept_name": "Marketing" },
    { "user_name": "Frank", "dept_name": "Marketing" },
    { "user_name": "Grace", "dept_name": null }
  ],
  "hint": ["LEFT JOINは左側のテーブルの行を、一致がなくてもすべて残します。", "一致しない場合、右側テーブルの列はNULLになります。"],
  "orderMatters": false
}
```

- [ ] **Step 12: `packages/problems/join/003.test.ts` を作成する**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("join/003.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./003.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(15);
    expect(problem.category).toBe("JOIN");
  });
});
```

- [ ] **Step 13: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — Step 1〜12で作成した6つの新規テストファイルは通るが（`parseProblem`は個別JSONを検証するだけのため）、`packages/problems/index.test.ts`はまだ15問を期待していないため後続のStepで更新する

- [ ] **Step 14: 失敗するテストを書く — `packages/problems/index.test.ts` を更新する**

現在のファイル全体を以下に置き換える:

```ts
import { describe, expect, it } from "vitest";
import { problems } from "./index";

describe("problems", () => {
  it("includes all seeded problems", () => {
    expect(problems).toHaveLength(15);
    expect(problems.map((p) => p.id).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
  });

  it("includes the original WHERE problem", () => {
    expect(problems.find((p) => p.id === 1)).toMatchObject({ id: 1, category: "WHERE" });
  });

  it("includes the new WHERE problems", () => {
    expect(problems.find((p) => p.id === 2)).toMatchObject({ id: 2, category: "WHERE" });
    expect(problems.find((p) => p.id === 3)).toMatchObject({ id: 3, category: "WHERE" });
    expect(problems.find((p) => p.id === 10)).toMatchObject({ id: 10, category: "WHERE" });
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
  });

  it("includes the JOIN problems", () => {
    expect(problems.find((p) => p.id === 8)).toMatchObject({ id: 8, category: "JOIN" });
    expect(problems.find((p) => p.id === 9)).toMatchObject({ id: 9, category: "JOIN" });
    expect(problems.find((p) => p.id === 15)).toMatchObject({ id: 15, category: "JOIN" });
  });
});
```

- [ ] **Step 15: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — `packages/problems/index.test.ts`が失敗する（`index.ts`がまだ15問を返さないため）

- [ ] **Step 16: `packages/problems/index.ts` を更新する**

現在のファイル全体を以下に置き換える:

```ts
import { parseProblem, type Problem } from "@sql-practice/shared";
import where001 from "./where/001.json";
import where002 from "./where/002.json";
import where003 from "./where/003.json";
import where004 from "./where/004.json";
import orderby001 from "./orderby/001.json";
import orderby002 from "./orderby/002.json";
import orderby003 from "./orderby/003.json";
import orderby004 from "./orderby/004.json";
import groupby001 from "./groupby/001.json";
import groupby002 from "./groupby/002.json";
import groupby003 from "./groupby/003.json";
import groupby004 from "./groupby/004.json";
import join001 from "./join/001.json";
import join002 from "./join/002.json";
import join003 from "./join/003.json";

export const problems: Problem[] = [
  where001,
  where002,
  where003,
  where004,
  orderby001,
  orderby002,
  orderby003,
  orderby004,
  groupby001,
  groupby002,
  groupby003,
  groupby004,
  join001,
  join002,
  join003,
].map(parseProblem);
```

- [ ] **Step 17: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS（全テストファイル）

- [ ] **Step 18: 実PGliteで新規6問の正誤判定を使い捨てスクリプトで検証する**

`packages/problems`の`index.ts`から実際の`problems`配列を読み込み、新規6問（id 10〜15）それぞれについて、設計書記載のSQL例を実PGlite上で実行し、`apps/web/src/judge`の`judge()`が`true`を返すことを確認する。コミット対象外の使い捨てスクリプトでよい（確認後削除する）。

Expected: 6問すべてで`judge()`が`true`

- [ ] **Step 19: `README.md`を更新する**

「全9問」を「全15問」に、カテゴリ内訳の記述があれば合わせて更新する。

- [ ] **Step 20: ビルドが通ることを確認する**

```bash
pnpm build
```

Expected: 成功

- [ ] **Step 21: E2Eテストが通ることを確認する**

```bash
pnpm test:e2e
```

Expected: PASS（既存E2Eは問題1・2に固定されているため、今回の追加による影響はないはずだが回帰がないことを確認する）

- [ ] **Step 22: コミットする**

```bash
git add packages/problems README.md
git commit -m "feat: add 6 more WHERE/ORDER BY/GROUP BY/JOIN problems"
```

---
