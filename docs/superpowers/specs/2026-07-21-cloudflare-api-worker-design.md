# Cloudflare Workers上でapps/apiを配信する 設計書

- 日付: 2026-07-21
- 対象: `apps/web`の静的アセットに加え、`/api/*`を同じCloudflare Workerで配信できるようにする（`apps/web/wrangler.jsonc`の後続）

## 背景・目的

`apps/web/wrangler.jsonc`で静的アセットのみをCloudflare Workersに配信する設定を用意したが、`apps/api`の`/api/problems`ルートは`node:fs`で`packages/problems`ディレクトリを実行時にスキャンする実装（`loadProblems`）のままで、Cloudflare Workers上では動かない（デプロイ先にソースのファイルシステムは存在しない）。

この設計は、`/api/problems`を`@sql-practice/problems`の`problems`配列（ビルド時に静的importされる、単一の情報源）から返すように変更し、同じWorkerで静的アセットとAPIの両方を配信できるところまでを対象とする。

デプロイの実行（`wrangler login`・実際の`wrangler deploy`）は対象外。

## スコープ

### 対象

- `apps/api/src/routes/problems.ts` — `loadProblems`（`node:fs`によるディレクトリスキャン）をやめ、`@sql-practice/problems`の`problems`配列を直接返す
- `apps/api/src/problems/loadProblems.ts`・`loadProblems.test.ts` — 呼び出し元がなくなるため削除
- `apps/api/package.json` — `@sql-practice/problems`を依存に追加、`exports`で`app`をimport可能にする
- `apps/web/worker.ts`（新規） — `/api/*`は`@sql-practice/api`のHonoアプリへ、それ以外は`env.ASSETS`へ振り分けるエントリポイント
- `apps/web/wrangler.jsonc` — `main: "worker.ts"`、`assets.run_worker_first: ["/api/*"]`を追加
- `apps/web/package.json` — `@sql-practice/api`・`@cloudflare/workers-types`を追加
- `apps/web/tsconfig.worker.json`（新規）・`apps/web/tsconfig.json` — `worker.ts`を型チェック対象に追加（既存の`tsconfig.app.json`/`tsconfig.node.json`と同じ構成パターン）
- `README.md` — 実装済みの内容に更新

### 対象外（後続タスク）

- 実際の`wrangler login`・`wrangler deploy`の実行
- `apps/api`のNode向けdevサーバー（`src/index.ts`・`@hono/node-server`）自体の変更（`/api/problems`の実装変更のみで、Node dev serverもそのまま動く）
- CORS・レート制限などAPIの追加機能

## データモデルと互換性

`apps/web`は既に`@sql-practice/problems`の`problems`配列をビルド時にimportして使っている。`apps/api`の`/api/problems`が同じ配列を返すようになることで、Web・APIの両方が`packages/problems/index.ts`を単一の情報源とする状態になる（`loadProblems`が別途ファイルシステムをスキャンして「もう一つの情報源」を作っていた状態を解消する）。

`GET /api/problems`のレスポンス形状（`Problem[]`のJSON配列）は変わらないため、既存の`apps/api/src/routes/problems.test.ts`のアサーション（9件・id=1の存在）はそのまま通る想定。

## ルーティング

`apps/web/worker.ts`は次の方針でリクエストを振り分ける（Cloudflare Workers Static Assetsの「SPA with API routes」パターン）：

- `/api/*` → `wrangler.jsonc`の`assets.run_worker_first`で先にWorkerへ渡し、`@sql-practice/api`の`app.fetch()`に委譲
- それ以外 → `env.ASSETS.fetch()`で静的アセット（`not_found_handling: "single-page-application"`によりSPAとして解決）
