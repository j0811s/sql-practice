# Cloudflare Workers上でapps/apiを配信する Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/api/problems`を`node:fs`のディレクトリスキャンではなく`@sql-practice/problems`の静的配列から返すようにし、`apps/web`の静的アセットと同じCloudflare Workerで`/api/*`も配信できるようにする。

**Architecture:** `apps/api/src/routes/problems.ts`を`@sql-practice/problems`直接import方式に変更し、`apps/api`を`exports`でimport可能にする。`apps/web/worker.ts`（新規）が`/api/*`を`@sql-practice/api`のHonoアプリへ、それ以外を`env.ASSETS`へ振り分ける。

**Tech Stack:** TypeScript, Hono, Vitest（既存構成のまま）。新規依存: `apps/api`に`@sql-practice/problems`、`apps/web`に`@sql-practice/api`・`@cloudflare/workers-types`。

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-07-21-cloudflare-api-worker-design.md`（承認済み）
- `GET /api/problems`のレスポンス形状は変えない（既存の`apps/api/src/routes/problems.test.ts`のアサーションを変更しない）
- `apps/api`のNode向けdevサーバー（`src/index.ts`）は変更しない
- 対象外: 実際の`wrangler deploy`の実行

---

### Task 1: apps/api — problemsルートを静的import方式に変更

**Files:**
- Modify: `apps/api/src/routes/problems.ts`
- Modify: `apps/api/package.json`
- Delete: `apps/api/src/problems/loadProblems.ts`
- Delete: `apps/api/src/problems/loadProblems.test.ts`

**Interfaces:**
- Consumes: `@sql-practice/problems`の`problems`配列（既存）
- Produces: `problemsRoute`（`apps/api/src/app.ts`が既存で使用、変更不要）

- [ ] **Step 1: 既存テストが通ることを確認してから変更を始める**

Run: `npx vitest run apps/api/src/routes/problems.test.ts apps/api/src/problems/loadProblems.test.ts`
Expected: PASS（変更前の現状確認）

- [ ] **Step 2: `apps/api/package.json`に依存を追加する**

`dependencies`に`"@sql-practice/problems": "workspace:*"`を追加する。

- [ ] **Step 3: `pnpm install`でワークスペースのリンクを更新する**

- [ ] **Step 4: `apps/api/src/routes/problems.ts`を書き換える**

```ts
import { Hono } from "hono";
import { problems } from "@sql-practice/problems";

export const problemsRoute = new Hono().get("/", (c) => c.json(problems));
```

- [ ] **Step 5: `loadProblems.ts`・`loadProblems.test.ts`を削除する**

呼び出し元がなくなるため削除する。

- [ ] **Step 6: テストが通ることを確認する**

Run: `npx vitest run apps/api`
Expected: PASS（`problems.test.ts`は変更なしで通る。`loadProblems.test.ts`は削除済みで対象外）

---

### Task 2: apps/api を import 可能にする（exports）

**Files:**
- Modify: `apps/api/package.json`

**Interfaces:**
- Produces: `@sql-practice/api`から`app`（Honoインスタンス）をimport可能にする（Task 3の`worker.ts`が使用）

- [ ] **Step 1: `apps/api/package.json`に`exports`を追加する**

```json
"exports": {
  ".": "./src/app.ts"
}
```

- [ ] **Step 2: 型チェックが通ることを確認する**

Run: `cd apps/api && npx tsc -b --noEmit`
Expected: エラーなし

---

### Task 3: apps/web — Workerエントリポイントとwrangler設定

**Files:**
- Create: `apps/web/worker.ts`
- Create: `apps/web/worker.test.ts`
- Create: `apps/web/tsconfig.worker.json`
- Modify: `apps/web/tsconfig.json`
- Modify: `apps/web/wrangler.jsonc`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: `@sql-practice/api`の`app`（Task 2）
- Produces: `wrangler.jsonc`の`main`が指すデフォルトexport（`fetch`ハンドラ）

- [ ] **Step 1: `apps/web/package.json`に依存を追加する**

`dependencies`に`"@sql-practice/api": "workspace:*"`、`devDependencies`に`"@cloudflare/workers-types"`を追加する。

- [ ] **Step 2: `pnpm install`でワークスペースのリンクを更新する**

- [ ] **Step 3: 失敗するテストを書く — `apps/web/worker.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";
import worker from "./worker";

function makeEnv() {
  return { ASSETS: { fetch: vi.fn(async () => new Response("asset")) } };
}

describe("worker fetch", () => {
  it("routes /api/* to the Hono app", async () => {
    const env = makeEnv();
    const res = await worker.fetch(new Request("https://example.com/api/health"), env as never, {} as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("routes everything else to ASSETS", async () => {
    const env = makeEnv();
    const request = new Request("https://example.com/");
    await worker.fetch(request, env as never, {} as never);
    expect(env.ASSETS.fetch).toHaveBeenCalledWith(request);
  });
});
```

- [ ] **Step 4: テストが失敗することを確認する**

Run: `npx vitest run apps/web/worker.test.ts`
Expected: FAIL — `worker.ts`が存在せず解決エラーになる

- [ ] **Step 5: `apps/web/worker.ts`を実装する**

```ts
import { app } from "@sql-practice/api";

interface Env {
  ASSETS: Fetcher;
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};
```

- [ ] **Step 6: テストが通ることを確認する**

Run: `npx vitest run apps/web/worker.test.ts`
Expected: PASS

- [ ] **Step 7: `apps/web/tsconfig.worker.json`を作成し、`tsconfig.json`から参照する**

`tsconfig.worker.json`（`tsconfig.app.json`/`tsconfig.node.json`と同じ構成パターン）:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.worker.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "types": ["@cloudflare/workers-types"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["worker.ts"]
}
```

`tsconfig.json`の`references`に`{ "path": "./tsconfig.worker.json" }`を追加する。

- [ ] **Step 8: `apps/web/wrangler.jsonc`を更新する**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "sql-practice-web",
  "main": "worker.ts",
  "compatibility_date": "2026-07-21",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  }
}
```

- [ ] **Step 9: 全体の型チェック・テスト・ビルドが通ることを確認する**

```bash
cd apps/web && npx tsc -b --noEmit
pnpm test
pnpm build
```

Expected: すべて成功

- [ ] **Step 10: README.mdを更新する**

「まだ実装していない」という注記を、実際の構成（`worker.ts`が`/api/*`をHonoに委譲する）の説明に置き換える。

---
