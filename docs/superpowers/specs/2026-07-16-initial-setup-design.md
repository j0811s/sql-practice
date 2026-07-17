# 初期プロジェクトセットアップ 設計書

- 日付: 2026-07-16
- 対象: SQL学習アプリの初期プロジェクトセットアップ（土台構築のみ、機能実装は対象外）

## 背景・目的

SQL学習アプリ（design docは `CLAUDE.md` 参照）の実装に先立ち、開発の土台となるモノレポ構成・技術スタックの導入・最小限の疎通確認を行う。

このタスクのゴールは「入力→SQL実行→結果表示」という一連の流れが技術的に成立することを確認することであり、正誤判定・レビュー生成・XP/レベルシステムなどのアプリケーションロジックは対象外（後続タスク）とする。

## 決定事項

| 項目                   | 決定                                                         | 理由                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| パッケージマネージャー | pnpm                                                         | 高速・ディスク効率が良く、workspacesとの相性が良い                                                                                                                 |
| リポジトリ構成         | pnpm workspaces モノレポ                                     | web/apiを分離しつつ、問題データ・型を共有パッケージとして両方から参照できる                                                                                        |
| SQL実行エンジン        | PGlite（PostgreSQL互換）                                     | CTE・Window関数・LATERALなどLv.9-10相当の機能をネイティブサポート。sql.js(SQLite)はWindow関数の一部構文やRIGHT/FULL JOIN未対応のため設計書のレベル設計と相性が悪い |
| ターミナルUI           | xterm.js                                                     | 本物のターミナルエミュレータ。VS Code/Hyperでも採用されている実績のあるライブラリ                                                                                  |
| Honoバックエンドの役割 | 静的配信 + 問題API（BFF）                                    | SQL実行はブラウザ内で完結するため、バックエンドは問題JSONの配信が主目的。将来的なユーザー進捗保存などの拡張に備える                                                |
| TypeScript構成         | ルート`tsconfig.base.json`共通化 + `packages/shared`で型共有 | web/apiで`Problem`型などの二重管理を防ぐ                                                                                                                           |
| Node.jsバージョン      | Node 22 LTS                                                  | 現行LTSを採用。`.nvmrc`と`package.json#engines`で固定                                                                                                              |

## リポジトリ構成

```
sql-practice/
├── apps/
│   ├── web/                  # React + TypeScript + Vite（フロントエンド）
│   │   └── src/
│   │       ├── terminal/     # xterm.js ラッパー
│   │       ├── db/           # PGlite 初期化・実行
│   │       ├── judge/        # 結果比較（正誤判定）※雛形のみ
│   │       ├── review/       # ルールベースレビュー生成 ※雛形のみ
│   │       └── xp/           # XP・レベル管理 ※雛形のみ
│   └── api/                  # Hono（静的配信 + 問題API）
│       └── src/
│           ├── index.ts
│           └── routes/problems.ts
├── packages/
│   ├── shared/                # 共有型（Problem型など）
│   │   └── src/types.ts
│   └── problems/               # 問題JSON（カテゴリ別ディレクトリ）
│       └── where/001.json      # 設計書の例題を1件配置
├── e2e/                        # Playwright テスト
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .nvmrc                       # Node 22
└── package.json                 # ルートワークスペーススクリプト
```

## 初期セットアップのスコープ（Definition of Done）

### apps/web

- Vite + React + TypeScript の scaffold
- xterm.js によるターミナル風入力欄
- PGlite を初期化し、入力SQLを実行できる
- 動作確認として設計書の例題（`users`テーブル、20歳以上取得）を実際に流し、入力→実行→結果表示の一連が通ることを確認
- `judge/`, `review/`, `xp/` はフォルダとエントリポイントの雛形のみ（ロジック未実装）

### apps/api

- Hono scaffold
- `GET /api/health` ヘルスチェック
- `GET /api/problems` で `packages/problems` 配下の一覧を返す最小実装

### packages/shared

- 設計書のJSONスキーマに対応する `Problem` 型定義

### packages/problems

- 設計書の例題1件を `where/001.json` として配置

### ツール・品質

- oxlint / oxfmt をルートに設定し、ワークスペース全体に適用
- Vitest をルートに設定（セットアップ確認用のダミーテスト1本）
- Playwright を `e2e/` に設定（「SQL入力→結果表示」のスモークテスト1本）
- ルート `package.json` に `dev` / `build` / `lint` / `format` / `test` / `test:e2e` スクリプト
- `README.md` にセットアップ手順を記載

## 対象外（後続タスク）

- 正誤判定ロジックの実装
- ルールベースレビュー生成ロジックの実装
- XP・レベルシステムの実装
- 問題データの充実（select/where/orderby/groupby/join/subquery/cte/window の網羅）
- 本番デプロイ構成
