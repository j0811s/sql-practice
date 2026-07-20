# SQL学習アプリ

ブラウザ上でSQLを学習できるWebアプリ。xterm.js製のターミナルUIにSQLを入力し、ブラウザ内DB（PGlite）上で実行して正誤判定・レビュー・XP獲得を行う。

## 主な機能

- ターミナルUIでSQLを入力・実行（ブラウザ内で完結、サーバー不要）
- 問題ごとに`CREATE TABLE`文を解析したSCHEMA表示（テーブル・列・PK/FKを一覧表示）
- 正誤判定と、不正解時のレビュー（間違いの傾向を示すメッセージ）生成
- 問題ごとに1つ確認できるヒント
- XP・レベルシステム（正解履歴は`localStorage`に保存）
- 問題一覧サイドバー（画面が狭い場合はハンバーガーメニューに切り替え）
- カテゴリ: WHERE / ORDER BY / GROUP BY / JOIN（全9問）

設計の詳細は`docs/superpowers/specs/`以下に機能ごとの設計書がある。

## 前提条件

- Node.js 24（`.nvmrc`参照）
- corepack経由のpnpm 11.13.1（`corepack enable && corepack prepare pnpm@11.13.1 --activate`）

## セットアップ

```bash
pnpm install
```

## スクリプト

| コマンド        | 内容                                             |
| --------------- | ------------------------------------------------ |
| `pnpm dev`      | `apps/web`（Vite）と`apps/api`（Hono）を並行起動 |
| `pnpm build`    | `apps/web`を本番ビルド                           |
| `pnpm lint`     | oxlintでリポジトリ全体をチェック                 |
| `pnpm format`   | oxfmtでリポジトリ全体を整形                      |
| `pnpm test`     | Vitestでユニットテストを実行                     |
| `pnpm test:e2e` | Playwrightでスモークテストを実行                 |

## デプロイ（Cloudflare Workers）

SQL実行はブラウザ内のPGlite（WASM）で完結するため、`apps/web`は静的アセット（`dist/`）として配信し、`/api/*`は`apps/web/worker.ts`から`@sql-practice/api`のHonoアプリに委譲する構成で、1つのWorkerとして公開できる。設定は`apps/web/wrangler.jsonc`（`assets.run_worker_first: ["/api/*"]`で`/api/*`のみWorkerを先に通す）。

`apps/api`の`/api/problems`は`@sql-practice/problems`の`problems`配列（`apps/web`が使っているものと同じ、ビルド時の静的import）を返すため、実行時にファイルシステムを読まず、Workers上でもそのまま動く。

```bash
cd apps/web
pnpm add -D wrangler   # 初回のみ
pnpm deploy            # vite buildしてwrangler deploy
```

## 構成

```
apps/
  web/       React + Vite + xterm.js + PGlite（学習UI本体）
  api/       Hono製の問題配信API（/api/problems, /api/health。Node dev server用。Cloudflare Workers向けにはapps/web/worker.tsからimportして使う）
packages/
  shared/    共有Problem型・パース処理
  problems/  問題JSON（where / orderby / groupby / join）
e2e/         Playwright スモークテスト
docs/        機能ごとの設計書・実装計画（docs/superpowers/{specs,plans}）
```
