# JOIN問題データとクエリパイプライン修正 設計書

- 日付: 2026-07-20
- 対象: クエリ実行パイプラインの同名列バグを修正し、JOIN問題を2問追加する（`docs/superpowers/specs/2026-07-19-problem-data-expansion-design.md` の後続）

## 背景・目的

JOIN問題を設計する過程で、`SELECT users.name, departments.name FROM users JOIN departments ...` のように**同名列を複数選択するクエリ**を実PGliteで実行したところ、`toTableResult`（列名でのルックアップ実装）がユーザー名を失い部署名を2重に表示するという不具合を発見した。これはPGlite自身がクエリ結果の行を`{name: ...}`のような列名キーのオブジェクトとして返す際、同名列が後の値で上書きされて1つに畳み込まれるために起きる。JOIN問題に限らず、同名列を選ぶあらゆる問題で起こりうる根本的な問題である。

この設計は、クエリ実行パイプラインを修正してこの問題を解消し、その上でJOIN問題を2問追加するところまでを対象とする。

サブクエリ・CTE・Window関数、複数問題切り替えE2EテストへのJOIN問題の追加は対象外（後続タスク）。

## スコープ

### 対象

- `apps/web/src/db/pglite.ts` — `runQuery`がPGliteの`rowMode: "array"`オプションを使うように修正
- `apps/web/src/db/queryResult.ts` — `toTableResult`が配列形式の行をそのまま使うように修正
- `apps/web/src/db/queryResult.test.ts` — 新しい行形式（配列）に合わせてフィクスチャを更新
- `packages/problems/join/001.json` + `001.test.ts`（新規）
- `packages/problems/join/002.json` + `002.test.ts`（新規）
- `packages/problems/index.ts`・`index.test.ts` — 9問に対応させる（更新）

### 対象外（後続タスク）

- サブクエリ・CTE・Window関数の問題
- 複数問題切り替えE2EテストへのJOIN問題の追加（既存のスイッチング機構はカテゴリ非依存のコードパスであるため、今回は見送る）

## クエリ実行パイプラインの修正

PGliteの`query()`に`rowMode: "array"`オプションを渡すと、`rows`が列名キーのオブジェクトではなく値の配列で返ることを実PGliteで確認した。同名列（`users.name`, `departments.name`）を含むクエリでも、両方の値が正しく位置ベースで保持される。

```ts
// apps/web/src/db/pglite.ts
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

```ts
// apps/web/src/db/queryResult.ts
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

既存の`packages/problems`の全7問について、修正後のパイプライン（`rowMode: "array"`）でも実PGliteで正しく`judge()`が真になることを検証済み（回帰なし）。

## JOIN問題用データ

既存の問題とは独立した専用のテーブル定義・シードデータを使う（既存の`users`テーブル定義とは別スキーマであり、他の問題には一切影響しない）。

```sql
CREATE TABLE departments(id INTEGER, name TEXT);
CREATE TABLE users(id INTEGER, name TEXT, age INTEGER, dept_id INTEGER);
INSERT INTO departments VALUES(1,'Sales');
INSERT INTO departments VALUES(2,'Engineering');
INSERT INTO departments VALUES(3,'Marketing');
INSERT INTO users VALUES(1,'Alice',22,1);
INSERT INTO users VALUES(2,'Bob',18,1);
INSERT INTO users VALUES(3,'Carol',35,2);
INSERT INTO users VALUES(4,'Dave',28,2);
INSERT INTO users VALUES(5,'Eve',41,3);
INSERT INTO users VALUES(6,'Frank',19,3);
```

## 2問の内容（修正後パイプラインで実PGlite実行し、`expectedResult`を検証済み）

### `join/001.json`（id: 8）

- 問題: 「全ユーザーの名前と所属部署名を取得してください。」
- SQL例: `SELECT users.name, departments.name FROM users JOIN departments ON users.dept_id = departments.id;`
- `expectedResult`: `[{"user_name":"Alice","dept_name":"Sales"},{"user_name":"Bob","dept_name":"Sales"},{"user_name":"Carol","dept_name":"Engineering"},{"user_name":"Dave","dept_name":"Engineering"},{"user_name":"Eve","dept_name":"Marketing"},{"user_name":"Frank","dept_name":"Marketing"}]`
- `orderMatters`: `false`
- `difficulty`: `4`

### `join/002.json`（id: 9）

- 問題: 「Marketing部署に所属するユーザーの名前を取得してください。」
- SQL例: `SELECT users.name FROM users JOIN departments ON users.dept_id = departments.id WHERE departments.name = 'Marketing';`
- `expectedResult`: `[{"name":"Eve"},{"name":"Frank"}]`
- `orderMatters`: `false`
- `difficulty`: `4`

## ファイル構成と`packages/problems/index.ts`の更新

既存のパターンを踏襲する:

```
packages/problems/
  (既存7問、変更なし)
  join/001.json + 001.test.ts（新規）
  join/002.json + 002.test.ts（新規）
  index.ts（更新: 全9問をimport・export）
  index.test.ts（更新: 9問になったことを検証）
```

## テスト計画

- `apps/web/src/db/queryResult.test.ts` を配列形式の行データに合わせて更新する。
- `apps/web/src/db/pglite.test.ts` は実際のクエリ結果を検証するテストであり、期待値の形式は変わらないため変更不要（修正後のパイプラインを通しても同じ結果が返ることを確認する）。
- 各新規問題ファイルについて、既存パターンと同じ形式の検証テストを追加する。
- `packages/problems/index.test.ts` を更新し、`problems`配列の長さが9であることを検証する。
