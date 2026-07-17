# SQL学習アプリ 初期セットアップ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** pnpm workspacesモノレポとして、SQL学習アプリの土台（React+Vite フロントエンド、Hono バックエンド、PGliteによるSQL実行、共有型・問題データパッケージ、Lint/Format/Unit/E2Eテストの各ツール）を構築し、「ターミナルにSQLを入力→PGliteで実行→結果表示」という一連の流れが実際に動作することを証明する。

**Architecture:** `apps/web`（React+Vite、xterm.jsのターミナルUIとPGliteでのSQL実行）と`apps/api`（Hono、問題JSON配信用のBFF）を、`packages/shared`（共有Problem型）と`packages/problems`（問題JSON）を介して疎結合に連携させる。正誤判定・レビュー生成・XPシステムは本タスクの対象外（フォルダ雛形のみ）。

**Tech Stack:** React 19 / TypeScript ~6.0.2 / Vite 8 / Hono 4 + @hono/node-server 2 / PGlite 0.5 / @xterm/xterm 6 / pnpm workspaces / oxlint + oxfmt / Vitest 4 / Playwright 1.61

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-07-16-initial-setup-design.md`（承認済み）
- Node.js: **24 LTS**（`.nvmrc`=`24`, `package.json#engines.node`=`>=24`）。設計書は「現行LTS」として当時Node 22を想定していたが、実行環境確認の結果、2026-07-16時点の現行LTSはNode 24（krypton）であるため更新する（設計意図の「現行LTSを採用」は維持）。
- パッケージマネージャー: pnpm 11.13.1（corepack経由）
- TypeScript: `~6.0.2`（`pnpm create vite`のreact-tsテンプレートが採用しているバージョンに揃える。TypeScript 7系はネイティブ移植直後でエコシステム互換性が未知数のため見送る）
- SQL実行エンジン: `@electric-sql/pglite@0.5.4`
- ターミナルUI: `@xterm/xterm@6.0.0` + `@xterm/addon-fit@0.11.0`
- バックエンド: `hono@4.12.30` + `@hono/node-server@2.0.10`、開発時は`tsx@4.23.1`でTS直接実行。Honoの「静的配信」役割はビルド済み`apps/web`を配信する本番デプロイ構成に属するため対象外とし、今回は問題APIのみ実装する（devでは`apps/web`はVite dev serverが直接配信する）
- Lint/Format: `oxlint@1.74.0` / `oxfmt@0.59.0`（ワークスペース全体、ルート設定を単一の情報源とする）
- テスト: `vitest@4.1.10`（ルート単一設定、Node環境、`{apps,packages}/*/**/*.test.ts`を横断実行。`packages/problems`のようにsrc/を持たないパッケージのテストも拾えるよう`src/`固定を外したグロブとする）/ `@playwright/test@1.61.1`（`e2e/`配下）
- リポジトリ構成: `apps/{web,api}` + `packages/{shared,problems}` のpnpm workspacesモノレポ
- 正誤判定・レビュー生成・XPロジック・問題データの拡充・本番デプロイ構成は対象外（`judge/`・`review/`・`xp/`はエントリポイントのみ用意）

---

### Task 1: モノレポ基盤のセットアップ

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.nvmrc`
- Create: `.gitignore`

**Interfaces:**

- Consumes: なし（最初のタスク）
- Produces: ルート`package.json`のスクリプト置き場（後続タスクが`scripts`に追記していく）、全パッケージが`extends`する`tsconfig.base.json`

- [ ] **Step 1: corepackでpnpmを有効化する**

```bash
corepack enable
corepack prepare pnpm@11.13.1 --activate
```

- [ ] **Step 2: pnpmのバージョンを確認する**

Run: `pnpm -v`
Expected: `11.13.1`

- [ ] **Step 3: `.nvmrc` を作成する**

```
24
```

- [ ] **Step 4: `pnpm-workspace.yaml` を作成する**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 5: `tsconfig.base.json` を作成する**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 6: ルート `package.json` を作成する**

```json
{
  "name": "sql-practice",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.13.1",
  "engines": {
    "node": ">=24"
  },
  "scripts": {}
}
```

- [ ] **Step 7: ルート `.gitignore` を作成する**

```
node_modules
dist
dist-ssr
*.local
*.log
.DS_Store

# Playwright
/test-results/
/playwright-report/
/playwright/.cache/

# Vite
.vite/
```

- [ ] **Step 8: 状態を確認してコミットする**

```bash
git status
git add package.json pnpm-workspace.yaml tsconfig.base.json .nvmrc .gitignore
git commit -m "chore: set up pnpm workspaces monorepo skeleton"
```

---

### Task 2: packages/shared — Problem型とparseProblem

**Files:**

- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/parseProblem.ts`
- Create: `packages/shared/src/index.ts`
- Test: `packages/shared/src/parseProblem.test.ts`
- Create: `vitest.config.ts`（ルート）
- Modify: `package.json`（ルート、`devDependencies`と`test`スクリプトを追加）

**Interfaces:**

- Consumes: `tsconfig.base.json`（Task 1）
- Produces: `Problem`型、`parseProblem(json: unknown): Problem`（不正な形なら`Error`を投げる）— Task 3・Task 4が使用

- [ ] **Step 1: `packages/shared/package.json` を作成する**

```json
{
  "name": "@sql-practice/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

- [ ] **Step 2: `packages/shared/tsconfig.json` を作成する**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: ルートに Vitest・TypeScript を導入する**

```bash
pnpm add -D -w vitest@4.1.10 typescript@~6.0.2 @types/node@^26.1.1
```

- [ ] **Step 4: ルート `vitest.config.ts` を作成する**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["{apps,packages}/*/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: ルート `package.json` に `test` スクリプトを追加する**

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

- [ ] **Step 6: 失敗するテストを書く — `packages/shared/src/parseProblem.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { parseProblem } from "./parseProblem";

const validProblem = {
  id: 1,
  title: "20歳以上を取得",
  difficulty: 1,
  category: "WHERE",
  question: "usersテーブルから20歳以上のユーザーを取得してください。",
  schema: ["CREATE TABLE users(id INTEGER,name TEXT,age INTEGER);"],
  seed: [
    "INSERT INTO users VALUES(1,'Alice',22);",
    "INSERT INTO users VALUES(2,'Bob',18);",
    "INSERT INTO users VALUES(3,'Carol',35);",
  ],
  expectedResult: [
    { id: 1, name: "Alice", age: 22 },
    { id: 3, name: "Carol", age: 35 },
  ],
  hint: ["WHERE句を使います。", "『以上』なので比較演算子を確認してみましょう。"],
};

describe("parseProblem", () => {
  it("returns the problem when the shape is valid", () => {
    expect(parseProblem(validProblem)).toEqual(validProblem);
  });

  it("throws when a required field has the wrong type", () => {
    expect(() => parseProblem({ ...validProblem, id: "1" })).toThrow("Problem.id must be a number");
  });

  it("throws when given a non-object", () => {
    expect(() => parseProblem(null)).toThrow("Problem must be an object");
  });
});
```

- [ ] **Step 7: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './parseProblem'` (ファイル未作成のため)

- [ ] **Step 8: `packages/shared/src/types.ts` を作成する**

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
}
```

- [ ] **Step 9: `packages/shared/src/parseProblem.ts` を実装する**

```ts
import type { Problem } from "./types";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseProblem(json: unknown): Problem {
  if (typeof json !== "object" || json === null) {
    throw new Error("Problem must be an object");
  }

  const candidate = json as Record<string, unknown>;

  if (typeof candidate.id !== "number") throw new Error("Problem.id must be a number");
  if (typeof candidate.title !== "string") throw new Error("Problem.title must be a string");
  if (typeof candidate.difficulty !== "number") {
    throw new Error("Problem.difficulty must be a number");
  }
  if (typeof candidate.category !== "string") {
    throw new Error("Problem.category must be a string");
  }
  if (typeof candidate.question !== "string") {
    throw new Error("Problem.question must be a string");
  }
  if (!isStringArray(candidate.schema)) throw new Error("Problem.schema must be a string array");
  if (!isStringArray(candidate.seed)) throw new Error("Problem.seed must be a string array");
  if (!Array.isArray(candidate.expectedResult)) {
    throw new Error("Problem.expectedResult must be an array");
  }
  if (!isStringArray(candidate.hint)) throw new Error("Problem.hint must be a string array");

  return candidate as unknown as Problem;
}
```

- [ ] **Step 10: `packages/shared/src/index.ts` を作成する**

```ts
export type { Problem } from "./types";
export { parseProblem } from "./parseProblem";
```

- [ ] **Step 11: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS — 3 tests passed

- [ ] **Step 12: コミットする**

```bash
git add packages/shared vitest.config.ts package.json pnpm-lock.yaml
git commit -m "feat: add shared Problem type and parseProblem validator"
```

---

### Task 3: packages/problems — 例題JSONの配置

**Files:**

- Create: `packages/problems/package.json`
- Create: `packages/problems/tsconfig.json`
- Create: `packages/problems/where/001.json`
- Test: `packages/problems/where/001.test.ts`

**Interfaces:**

- Consumes: `@sql-practice/shared`の`parseProblem`（Task 2）
- Produces: `packages/problems/where/001.json`（Task 4の`loadProblems`が読み込む実データ）

- [ ] **Step 1: `packages/problems/package.json` を作成する**

```json
{
  "name": "@sql-practice/problems",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@sql-practice/shared": "workspace:*"
  }
}
```

- [ ] **Step 2: `packages/problems/tsconfig.json` を作成する**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "noEmit": true
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 3: 依存関係をリンクする**

```bash
pnpm install
```

- [ ] **Step 4: 失敗するテストを書く — `packages/problems/where/001.test.ts`**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseProblem } from "@sql-practice/shared";

describe("where/001.json", () => {
  it("is a valid Problem", () => {
    const raw = readFileSync(new URL("./001.json", import.meta.url), "utf-8");
    const problem = parseProblem(JSON.parse(raw));

    expect(problem.id).toBe(1);
    expect(problem.category).toBe("WHERE");
  });
});
```

- [ ] **Step 5: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — `ENOENT` (`001.json`が存在しないため)

- [ ] **Step 6: `packages/problems/where/001.json` を作成する**

```json
{
  "id": 1,
  "title": "20歳以上を取得",
  "difficulty": 1,
  "category": "WHERE",
  "question": "usersテーブルから20歳以上のユーザーを取得してください。",
  "schema": ["CREATE TABLE users(id INTEGER,name TEXT,age INTEGER);"],
  "seed": [
    "INSERT INTO users VALUES(1,'Alice',22);",
    "INSERT INTO users VALUES(2,'Bob',18);",
    "INSERT INTO users VALUES(3,'Carol',35);"
  ],
  "expectedResult": [
    { "id": 1, "name": "Alice", "age": 22 },
    { "id": 3, "name": "Carol", "age": 35 }
  ],
  "hint": ["WHERE句を使います。", "『以上』なので比較演算子を確認してみましょう。"]
}
```

- [ ] **Step 7: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 8: コミットする**

```bash
git add packages/problems pnpm-lock.yaml
git commit -m "feat: add first seeded problem (WHERE 001)"
```

---

### Task 4: apps/api — Hono ヘルスチェック & 問題API

**Files:**

- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/problems/loadProblems.ts`
- Test: `apps/api/src/problems/loadProblems.test.ts`
- Create: `apps/api/src/routes/problems.ts`
- Test: `apps/api/src/routes/problems.test.ts`
- Create: `apps/api/src/app.ts`
- Test: `apps/api/src/app.test.ts`
- Create: `apps/api/src/index.ts`

**Interfaces:**

- Consumes: `Problem`型・`parseProblem`（Task 2）、`packages/problems/where/001.json`（Task 3）
- Produces: `export const app: Hono`（`apps/api/src/app.ts`）— サーバー起動（`index.ts`）とテストの両方から利用

- [ ] **Step 1: `apps/api/package.json` を作成する**

```json
{
  "name": "@sql-practice/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@hono/node-server": "^2.0.10",
    "@sql-practice/shared": "workspace:*",
    "hono": "^4.12.30"
  },
  "devDependencies": {
    "tsx": "^4.23.1"
  }
}
```

- [ ] **Step 2: `apps/api/tsconfig.json` を作成する**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 依存関係をインストールする**

```bash
pnpm install
```

- [ ] **Step 4: 失敗するテストを書く — `apps/api/src/problems/loadProblems.test.ts`**

```ts
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadProblems } from "./loadProblems";

const here = dirname(fileURLToPath(import.meta.url));
const problemsDir = resolve(here, "../../../../packages/problems");

describe("loadProblems", () => {
  it("loads the seeded example problem", () => {
    const problems = loadProblems(problemsDir);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ id: 1, category: "WHERE" });
  });
});
```

- [ ] **Step 5: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './loadProblems'`

- [ ] **Step 6: `apps/api/src/problems/loadProblems.ts` を実装する**

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseProblem, type Problem } from "@sql-practice/shared";

export function loadProblems(problemsDir: string): Problem[] {
  const categories = readdirSync(problemsDir, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  );

  const problems: Problem[] = [];
  for (const category of categories) {
    const categoryDir = join(problemsDir, category.name);
    const files = readdirSync(categoryDir).filter((name) => name.endsWith(".json"));
    for (const file of files) {
      const raw = readFileSync(join(categoryDir, file), "utf-8");
      problems.push(parseProblem(JSON.parse(raw)));
    }
  }
  return problems;
}
```

- [ ] **Step 7: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 8: 失敗するテストを書く — `apps/api/src/routes/problems.test.ts`**

```ts
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { problemsRoute } from "./problems";

describe("GET /api/problems", () => {
  it("returns the seeded example problem", async () => {
    const app = new Hono().route("/api/problems", problemsRoute);
    const res = await app.request("/api/problems");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(1);
  });
});
```

- [ ] **Step 9: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './problems'`

- [ ] **Step 10: `apps/api/src/routes/problems.ts` を実装する**

```ts
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { loadProblems } from "../problems/loadProblems";

const here = dirname(fileURLToPath(import.meta.url));
const PROBLEMS_DIR = resolve(here, "../../../../packages/problems");

export const problemsRoute = new Hono().get("/", (c) => c.json(loadProblems(PROBLEMS_DIR)));
```

- [ ] **Step 11: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 12: 失敗するテストを書く — `apps/api/src/app.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { app } from "./app";

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 13: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './app'`

- [ ] **Step 14: `apps/api/src/app.ts` を実装する**

```ts
import { Hono } from "hono";
import { problemsRoute } from "./routes/problems";

export const app = new Hono();

app.get("/api/health", (c) => c.json({ status: "ok" }));
app.route("/api/problems", problemsRoute);
```

- [ ] **Step 15: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 16: サーバー起動エントリポイント `apps/api/src/index.ts` を作成する**

```ts
import { serve } from "@hono/node-server";
import { app } from "./app";

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API server listening on http://localhost:${info.port}`);
});
```

- [ ] **Step 17: コミットする**

```bash
git add apps/api pnpm-lock.yaml
git commit -m "feat: add Hono API with health check and problems endpoint"
```

---

### Task 5: apps/web — Vite + React + TypeScript scaffold

**Files:**

- Create: `apps/web/**`（`pnpm create vite`が生成）
- Modify: `apps/web/package.json`
- Modify: `apps/web/tsconfig.app.json`
- Modify: `apps/web/tsconfig.node.json`
- Modify: `apps/web/src/App.tsx`
- Delete: `apps/web/.gitignore`, `apps/web/.oxlintrc.json`
- Modify: `package.json`（ルート、`dev`/`build`スクリプト追加）

**Interfaces:**

- Consumes: `tsconfig.base.json`（Task 1）
- Produces: `apps/web`アプリの雛形（Task 6・7がここに機能を追加していく）

- [ ] **Step 1: Viteプロジェクトをscaffoldする**

```bash
pnpm create vite apps/web -- --template react-ts
```

Expected: `apps/web/` 配下に `package.json` / `src/App.tsx` / `vite.config.ts` などが生成される

- [ ] **Step 2: `apps/web/package.json` の `name` をモノレポの命名規則に合わせる**

`apps/web/package.json` の `"name": "web"` を `"name": "@sql-practice/web"` に変更する。また `"scripts"` から `"lint": "oxlint"` の行を削除する（Lintはルートで一元管理するため。Task 8参照）。

- [ ] **Step 3: モノレポ側で重複する設定ファイルを削除する**

```bash
rm apps/web/.gitignore apps/web/.oxlintrc.json
```

- [ ] **Step 4: `apps/web/tsconfig.app.json` の先頭に `extends` を追加する**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
```

（既存の`compilerOptions`以下はそのまま）

- [ ] **Step 5: `apps/web/tsconfig.node.json` の先頭に `extends` を追加する**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
```

（既存の`compilerOptions`以下はそのまま）

- [ ] **Step 6: `apps/web/src/App.tsx` を最小限のプレースホルダーに置き換える**

```tsx
function App() {
  return (
    <main>
      <h1>SQL Practice</h1>
    </main>
  );
}

export default App;
```

- [ ] **Step 7: `apps/web/src/App.css` の中身を空にする**

`apps/web/src/App.css` の内容を空文字列にする（テンプレートのデモ用スタイルを削除）。

- [ ] **Step 8: ルート `package.json` に `dev` / `build` スクリプトを追加する**

```json
{
  "scripts": {
    "dev": "pnpm --parallel --filter ./apps/* dev",
    "build": "pnpm --filter @sql-practice/web build"
  }
}
```

- [ ] **Step 9: 依存関係をインストールする**

```bash
pnpm install
```

- [ ] **Step 10: ビルドできることを確認する**

Run: `pnpm build`
Expected: `tsc -b` がエラーなく完了し、`vite build` が `built in` ログとともに成功する

- [ ] **Step 11: コミットする**

```bash
git add apps/web package.json pnpm-lock.yaml
git commit -m "feat: scaffold apps/web with Vite + React + TypeScript"
```

---

### Task 6: apps/web — PGlite によるSQL実行モジュール

**Files:**

- Modify: `apps/web/package.json`（`@electric-sql/pglite`追加）
- Create: `apps/web/src/db/queryResult.ts`
- Test: `apps/web/src/db/queryResult.test.ts`
- Create: `apps/web/src/db/pglite.ts`
- Test: `apps/web/src/db/pglite.test.ts`

**Interfaces:**

- Consumes: なし（PGliteパッケージのみ）
- Produces: `createDb(): Promise<PGlite>`, `runQuery(db: PGlite, sql: string): Promise<TableResult>`, `TableResult { columns: string[]; rows: unknown[][] }` — Task 7の`App.tsx`が使用

- [ ] **Step 1: PGliteを依存関係に追加する**

```bash
pnpm --filter @sql-practice/web add @electric-sql/pglite@0.5.4
```

- [ ] **Step 2: 失敗するテストを書く — `apps/web/src/db/queryResult.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { toTableResult } from "./queryResult";

describe("toTableResult", () => {
  it("converts field/row objects into a column-ordered table", () => {
    const result = toTableResult({
      fields: [{ name: "id" }, { name: "name" }, { name: "age" }],
      rows: [
        { id: 1, name: "Alice", age: 22 },
        { id: 3, name: "Carol", age: 35 },
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
});
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './queryResult'`

- [ ] **Step 4: `apps/web/src/db/queryResult.ts` を実装する**

```ts
export interface TableResult {
  columns: string[];
  rows: unknown[][];
}

interface RawQueryResult {
  fields: { name: string }[];
  rows: Record<string, unknown>[];
}

export function toTableResult(result: RawQueryResult): TableResult {
  const columns = result.fields.map((field) => field.name);
  const rows = result.rows.map((row) => columns.map((column) => row[column]));
  return { columns, rows };
}
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 6: 失敗するテストを書く — `apps/web/src/db/pglite.test.ts`**

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
});
```

- [ ] **Step 7: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './pglite'`

- [ ] **Step 8: `apps/web/src/db/pglite.ts` を実装する**

```ts
import { PGlite } from "@electric-sql/pglite";
import { toTableResult, type TableResult } from "./queryResult";

export async function createDb(): Promise<PGlite> {
  return new PGlite();
}

export async function runQuery(db: PGlite, sql: string): Promise<TableResult> {
  const result = await db.query(sql);
  return toTableResult(result);
}
```

- [ ] **Step 9: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS（設計書の例題と同じ入出力が、実際のPGliteで再現されることを確認）

- [ ] **Step 10: コミットする**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat: add PGlite-backed query execution module"
```

---

### Task 7: apps/web — xterm.js ターミナルUIと画面組み込み

**Files:**

- Modify: `apps/web/package.json`（`@xterm/xterm`, `@xterm/addon-fit`追加）
- Create: `apps/web/src/terminal/lineBuffer.ts`
- Test: `apps/web/src/terminal/lineBuffer.test.ts`
- Create: `apps/web/src/terminal/TerminalView.tsx`
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/judge/index.ts`
- Create: `apps/web/src/review/index.ts`
- Create: `apps/web/src/xp/index.ts`

**Interfaces:**

- Consumes: `createDb`/`runQuery`/`TableResult`（Task 6）
- Produces: `TerminalView` コンポーネント（`onSubmit: (sql: string) => void` prop）。`judge`/`review`/`xp` は本タスクでは中身を実装しない空モジュール（後続タスクが実装する場所を確保するのみ）

- [ ] **Step 1: xterm.jsを依存関係に追加する**

```bash
pnpm --filter @sql-practice/web add @xterm/xterm@6.0.0 @xterm/addon-fit@0.11.0
```

- [ ] **Step 2: 失敗するテストを書く — `apps/web/src/terminal/lineBuffer.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { reduceLineBuffer, toLineBufferEvent } from "./lineBuffer";

describe("reduceLineBuffer", () => {
  it("appends printable characters to the buffer and echoes them", () => {
    const result = reduceLineBuffer("SELECT", { type: "printable", char: " " });
    expect(result).toEqual({ buffer: "SELECT ", echo: " " });
  });

  it("removes the last character on backspace", () => {
    const result = reduceLineBuffer("SELECT", { type: "backspace" });
    expect(result).toEqual({ buffer: "SELEC", echo: "\b \b" });
  });

  it("is a no-op when backspacing an empty buffer", () => {
    const result = reduceLineBuffer("", { type: "backspace" });
    expect(result).toEqual({ buffer: "", echo: "" });
  });

  it("submits the line and resets the buffer on enter", () => {
    const result = reduceLineBuffer("SELECT 1;", { type: "enter" });
    expect(result).toEqual({ buffer: "", echo: "\r\n", submittedLine: "SELECT 1;" });
  });
});

describe("toLineBufferEvent", () => {
  it("maps carriage return to enter", () => {
    expect(toLineBufferEvent("\r")).toEqual({ type: "enter" });
  });

  it("maps DEL to backspace", () => {
    expect(toLineBufferEvent("\x7f")).toEqual({ type: "backspace" });
  });

  it("maps a single printable character", () => {
    expect(toLineBufferEvent("a")).toEqual({ type: "printable", char: "a" });
  });

  it("ignores control sequences such as arrow keys", () => {
    expect(toLineBufferEvent("\x1b[A")).toBeNull();
  });
});
```

- [ ] **Step 3: テストが失敗することを確認する**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './lineBuffer'`

- [ ] **Step 4: `apps/web/src/terminal/lineBuffer.ts` を実装する**

```ts
export type LineBufferEvent =
  { type: "printable"; char: string } | { type: "backspace" } | { type: "enter" };

export interface LineBufferResult {
  buffer: string;
  echo: string;
  submittedLine?: string;
}

export function reduceLineBuffer(buffer: string, event: LineBufferEvent): LineBufferResult {
  switch (event.type) {
    case "printable":
      return { buffer: buffer + event.char, echo: event.char };
    case "backspace":
      if (buffer.length === 0) {
        return { buffer, echo: "" };
      }
      return { buffer: buffer.slice(0, -1), echo: "\b \b" };
    case "enter":
      return { buffer: "", echo: "\r\n", submittedLine: buffer };
  }
}

export function toLineBufferEvent(data: string): LineBufferEvent | null {
  if (data === "\r") return { type: "enter" };
  if (data === "\x7f") return { type: "backspace" };
  if (data.length === 1 && data >= " ") return { type: "printable", char: data };
  return null;
}
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 6: `apps/web/src/terminal/TerminalView.tsx` を実装する**

```tsx
import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { reduceLineBuffer, toLineBufferEvent } from "./lineBuffer";

const PROMPT = "sql> ";

interface TerminalViewProps {
  onSubmit: (sql: string) => void;
}

export function TerminalView({ onSubmit }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({ cursorBlink: true, convertEol: true });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    term.write(PROMPT);

    let buffer = "";
    const disposable = term.onData((data) => {
      const event = toLineBufferEvent(data);
      if (!event) return;

      const result = reduceLineBuffer(buffer, event);
      buffer = result.buffer;
      term.write(result.echo);

      if (result.submittedLine !== undefined) {
        onSubmit(result.submittedLine);
        term.write(PROMPT);
      }
    });

    return () => {
      disposable.dispose();
      term.dispose();
    };
  }, [onSubmit]);

  return <div ref={containerRef} style={{ height: "300px" }} />;
}
```

- [ ] **Step 7: `apps/web/src/App.tsx` を実装し、ターミナル・DB・結果表示を結線する**

```tsx
import { useEffect, useState } from "react";
import type { PGlite } from "@electric-sql/pglite";
import { createDb, runQuery } from "./db/pglite";
import type { TableResult } from "./db/queryResult";
import { TerminalView } from "./terminal/TerminalView";

const SEED_SQL = [
  "CREATE TABLE users(id INTEGER,name TEXT,age INTEGER);",
  "INSERT INTO users VALUES(1,'Alice',22);",
  "INSERT INTO users VALUES(2,'Bob',18);",
  "INSERT INTO users VALUES(3,'Carol',35);",
];

function App() {
  const [db, setDb] = useState<PGlite | null>(null);
  const [result, setResult] = useState<TableResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createDb().then(async (instance) => {
      for (const statement of SEED_SQL) {
        await instance.exec(statement);
      }
      if (!cancelled) setDb(instance);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(sql: string) {
    if (!db || sql.trim() === "") return;
    try {
      setError(null);
      setResult(await runQuery(db, sql));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main>
      <h1>SQL Practice</h1>
      <p>usersテーブルにSELECT文を入力してEnterで実行してください。</p>
      <TerminalView onSubmit={handleSubmit} />
      {error && <p role="alert">{error}</p>}
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

- [ ] **Step 8: 正誤判定・レビュー・XPの雛形フォルダを作成する**

```bash
mkdir -p apps/web/src/judge apps/web/src/review apps/web/src/xp
```

`apps/web/src/judge/index.ts`:

```ts
export {};
```

`apps/web/src/review/index.ts`:

```ts
export {};
```

`apps/web/src/xp/index.ts`:

```ts
export {};
```

- [ ] **Step 9: ユニットテストとビルドの両方が通ることを確認する**

```bash
pnpm test
pnpm build
```

Expected: 両方成功（`pnpm test`はTask 2・4・6・7で追加した全テストがPASS、`pnpm build`は`built in`ログで完了）

- [ ] **Step 10: コミットする**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat: wire xterm.js terminal to PGlite execution and result display"
```

---

### Task 8: oxlint / oxfmt をルートに設定する

**Files:**

- Modify: `package.json`（ルート、devDependenciesと`lint`/`format`スクリプト追加）
- Create: `.oxlintrc.json`
- Create: `.oxfmtrc.json`

**Interfaces:**

- Consumes: なし
- Produces: `pnpm lint` / `pnpm format`（リポジトリ全体に適用）

- [ ] **Step 1: oxlint・oxfmtをルートに導入する**

```bash
pnpm add -D -w oxlint@1.74.0 oxfmt@0.59.0
```

- [ ] **Step 2: `.oxlintrc.json` を作成する**

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

- [ ] **Step 3: `.oxfmtrc.json` を生成する**

```bash
pnpm exec oxfmt --init
```

Expected: リポジトリルートに `.oxfmtrc.json` が生成される

- [ ] **Step 4: ルート `package.json` に `lint` / `format` スクリプトを追加する**

```json
{
  "scripts": {
    "lint": "oxlint .",
    "format": "oxfmt --write ."
  }
}
```

- [ ] **Step 5: Lintが通ることを確認する**

Run: `pnpm lint`
Expected: エラーなく完了する（警告が出た場合はコードを修正する）

- [ ] **Step 6: フォーマットを適用する**

```bash
pnpm format
git diff --stat
```

Expected: フォーマット差分がある場合は整形後のコードで上書きされる（差分がなければ何も変わらない）

- [ ] **Step 7: コミットする**

```bash
git add -A
git commit -m "chore: configure oxlint and oxfmt at the workspace root"
```

---

### Task 9: Playwright E2E スモークテスト

**Files:**

- Modify: `package.json`（ルート、devDependenciesと`test:e2e`スクリプト追加）
- Create: `playwright.config.ts`
- Create: `e2e/sql-execution.spec.ts`

**Interfaces:**

- Consumes: `apps/web`の起動済みdevサーバー（`http://localhost:5173`）
- Produces: `pnpm test:e2e`

- [ ] **Step 1: Playwrightをルートに導入する**

```bash
pnpm add -D -w @playwright/test@1.61.1
```

- [ ] **Step 2: Chromiumブラウザをインストールする**

```bash
pnpm exec playwright install --with-deps chromium
```

- [ ] **Step 3: `playwright.config.ts` を作成する**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "pnpm --filter @sql-practice/web dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:5173",
  },
});
```

- [ ] **Step 4: `e2e/sql-execution.spec.ts` を作成する**

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
});
```

- [ ] **Step 5: ルート `package.json` に `test:e2e` スクリプトを追加する**

```json
{
  "scripts": {
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 6: E2Eテストが通ることを確認する**

Run: `pnpm test:e2e`
Expected: `1 passed`

- [ ] **Step 7: コミットする**

```bash
git add e2e playwright.config.ts package.json pnpm-lock.yaml
git commit -m "test: add Playwright smoke test for SQL execution flow"
```

---

### Task 10: README と最終疎通確認

**Files:**

- Create: `README.md`

**Interfaces:**

- Consumes: Task 1〜9で完成した全スクリプト（`dev`/`build`/`lint`/`format`/`test`/`test:e2e`）
- Produces: 最終検証結果（このタスクに閉じる）

- [ ] **Step 1: `README.md` を作成する**

```markdown
# SQL学習アプリ

ブラウザ上でSQLを学習できるWebアプリ（初期セットアップ段階）。

設計の詳細は以下を参照:

- `CLAUDE.md` — アプリ全体の設計書
- `docs/superpowers/specs/2026-07-16-initial-setup-design.md` — 初期セットアップの設計書

## 前提条件

- Node.js 24（`.nvmrc`参照）
- corepack経由のpnpm 11.13.1（`corepack enable && corepack prepare pnpm@11.13.1 --activate`）

## セットアップ

\`\`\`bash
pnpm install
\`\`\`

## スクリプト

| コマンド        | 内容                                             |
| --------------- | ------------------------------------------------ |
| `pnpm dev`      | `apps/web`（Vite）と`apps/api`（Hono）を並行起動 |
| `pnpm build`    | `apps/web`を本番ビルド                           |
| `pnpm lint`     | oxlintでリポジトリ全体をチェック                 |
| `pnpm format`   | oxfmtでリポジトリ全体を整形                      |
| `pnpm test`     | Vitestでユニットテストを実行                     |
| `pnpm test:e2e` | Playwrightでスモークテストを実行                 |

## 構成

\`\`\`
apps/
web/ React + Vite + xterm.js + PGlite
api/ Hono（静的配信 + 問題API）
packages/
shared/ 共有Problem型
problems/ 問題JSON（カテゴリ別）
e2e/ Playwright テスト
\`\`\`

## スコープ

正誤判定・レビュー生成・XPシステムは未実装（`apps/web/src/{judge,review,xp}`にエントリポイントのみ用意）。
```

- [ ] **Step 2: 全体の依存関係を再インストールし、クリーンな状態を確認する**

```bash
pnpm install
```

Expected: エラーなく完了する

- [ ] **Step 3: Lint・Format・ユニットテストを実行する**

```bash
pnpm lint
pnpm format
pnpm test
```

Expected: すべて成功する

- [ ] **Step 4: E2Eテストを実行する**

```bash
pnpm test:e2e
```

Expected: `1 passed`

- [ ] **Step 5: ビルドを確認する**

```bash
pnpm build
```

Expected: `built in` ログとともに成功する

- [ ] **Step 6: `dev` スクリプトで web/api が両方立ち上がることを手動確認する**

```bash
pnpm dev &
DEV_PID=$!
sleep 3
curl -sf http://localhost:8787/api/health
echo
curl -sf http://localhost:5173/ | grep -o '<div id="root">'
kill $DEV_PID
```

Expected: `{"status":"ok"}` と `<div id="root">` がそれぞれ出力される

- [ ] **Step 7: コミットする**

```bash
git add README.md
git commit -m "docs: add project README with setup instructions"
```
