# SQL学習アプリ

ブラウザ上でSQLを学習できるWebアプリ（初期セットアップ段階）。

設計の詳細は以下を参照:

- `CLAUDE.md` — アプリ全体の設計書
- `docs/superpowers/specs/2026-07-16-initial-setup-design.md` — 初期セットアップの設計書

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

## 構成

```
apps/
  web/       React + Vite + xterm.js + PGlite
  api/       Hono（静的配信 + 問題API）
packages/
  shared/    共有Problem型
  problems/  問題JSON（カテゴリ別）
e2e/         Playwright テスト
```

## スコープ

正誤判定・レビュー生成・XPシステムは未実装（`apps/web/src/{judge,review,xp}`にエントリポイントのみ用意）。
