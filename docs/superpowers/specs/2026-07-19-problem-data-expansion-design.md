# 問題データの拡充（WHERE/ORDER BY/GROUP BY） 設計書

- 日付: 2026-07-19
- 対象: `packages/problems` に WHERE・ORDER BY・GROUP BY の問題を各2問追加する（`docs/superpowers/specs/2026-07-19-problem-list-design.md` の後続）

## 背景・目的

現在 `packages/problems` にはWHERE問題（`where/001.json`）が1件しかなく、複数問題選択UIの実際の切り替え動作を意味のある形で検証できない。この設計は、基本構文（WHERE・ORDER BY・GROUP BY）の問題を各2問追加し、計7問にするところまでを対象とする。

JOIN・サブクエリ・CTE・Window関数は対象外（別フェーズ。usersテーブルだけでは表現できず新しいテーブル設計が必要なため）。複数問題選択UIの実際の切り替え動作を検証するE2Eテストの追加、`apps/api`との連携確認も対象外（後続タスク）。

## スコープ

### 対象

- `packages/problems/where/002.json` + `002.test.ts`（新規）
- `packages/problems/where/003.json` + `003.test.ts`（新規）
- `packages/problems/orderby/001.json` + `001.test.ts`（新規）
- `packages/problems/orderby/002.json` + `002.test.ts`（新規）
- `packages/problems/groupby/001.json` + `001.test.ts`（新規）
- `packages/problems/groupby/002.json` + `002.test.ts`（新規）
- `packages/problems/index.ts` — 新規7問全てをimport・export（更新）
- `packages/problems/index.test.ts` — 7問になったことの検証（更新）

既存の `packages/problems/where/001.json` は変更しない。

### 対象外（後続タスク）

- JOIN・サブクエリ・CTE・Window関数の問題
- 複数問題選択UIの実際の切り替え動作を検証するE2Eテスト
- `apps/api`の`/api/problems`エンドポイントとの連携確認

## 共通データ

新規6問はすべて同じテーブル定義・シードデータを共有する（既存の`where/001.json`は独自の3列テーブルのまま変更しない）。

```sql
CREATE TABLE users(id INTEGER, name TEXT, age INTEGER, dept TEXT);
INSERT INTO users VALUES(1,'Alice',22,'Sales');
INSERT INTO users VALUES(2,'Bob',18,'Sales');
INSERT INTO users VALUES(3,'Carol',35,'Engineering');
INSERT INTO users VALUES(4,'Dave',28,'Engineering');
INSERT INTO users VALUES(5,'Eve',41,'Marketing');
INSERT INTO users VALUES(6,'Frank',19,'Marketing');
```

## 型に関する注意（実PGliteで検証済み）

PGliteで集計関数を実行し、返り値のJS型を確認した:

| 関数 | 返り値の型 | 例 |
| ---- | ---------- | -- |
| `COUNT(*)` | `number` | `2` |
| `SUM(INTEGER列)` | `number` | `63` |
| `AVG(INTEGER列)` | **`string`** | `"20.0000000000000000"` |

`AVG`はPostgreSQLのNUMERIC型の精度をそのまま文字列で返すため、素直に書いた`expectedResult`（JSの数値）とは絶対に一致しない。このため、今回のGROUP BY問題では`AVG`を避け、`COUNT`と`SUM`のみを使用する。

## 6問の内容（全て実PGliteで実行し、`expectedResult`を検証済み）

### `where/002.json`（id: 2）

- 問題: 「Engineeringの部署のユーザーを取得してください。」
- SQL例: `SELECT id, name, age, dept FROM users WHERE dept = 'Engineering';`
- `expectedResult`: `[{"id":3,"name":"Carol","age":35,"dept":"Engineering"},{"id":4,"name":"Dave","age":28,"dept":"Engineering"}]`
- `orderMatters`: `false`
- `difficulty`: `1`

### `where/003.json`（id: 3）

- 問題: 「30歳未満のユーザーを取得してください。」
- SQL例: `SELECT id, name, age, dept FROM users WHERE age < 30;`
- `expectedResult`: `[{"id":1,"name":"Alice","age":22,"dept":"Sales"},{"id":2,"name":"Bob","age":18,"dept":"Sales"},{"id":4,"name":"Dave","age":28,"dept":"Engineering"},{"id":6,"name":"Frank","age":19,"dept":"Marketing"}]`
- `orderMatters`: `false`
- `difficulty`: `1`

### `orderby/001.json`（id: 4）

- 問題: 「全ユーザーを年齢の若い順に並べて取得してください。」
- SQL例: `SELECT id, name, age, dept FROM users ORDER BY age ASC;`
- `expectedResult`: `[{"id":2,"name":"Bob","age":18,"dept":"Sales"},{"id":6,"name":"Frank","age":19,"dept":"Marketing"},{"id":1,"name":"Alice","age":22,"dept":"Sales"},{"id":4,"name":"Dave","age":28,"dept":"Engineering"},{"id":3,"name":"Carol","age":35,"dept":"Engineering"},{"id":5,"name":"Eve","age":41,"dept":"Marketing"}]`
- `orderMatters`: `true`
- `difficulty`: `2`

### `orderby/002.json`（id: 5）

- 問題: 「全ユーザーを年齢の高い順に並べて取得してください。」
- SQL例: `SELECT id, name, age, dept FROM users ORDER BY age DESC;`
- `expectedResult`: `[{"id":5,"name":"Eve","age":41,"dept":"Marketing"},{"id":3,"name":"Carol","age":35,"dept":"Engineering"},{"id":4,"name":"Dave","age":28,"dept":"Engineering"},{"id":1,"name":"Alice","age":22,"dept":"Sales"},{"id":6,"name":"Frank","age":19,"dept":"Marketing"},{"id":2,"name":"Bob","age":18,"dept":"Sales"}]`
- `orderMatters`: `true`
- `difficulty`: `2`

### `groupby/001.json`（id: 6）

- 問題: 「部署ごとの人数を取得してください。」
- SQL例: `SELECT dept, COUNT(*) FROM users GROUP BY dept;`
- `expectedResult`: `[{"dept":"Sales","count":2},{"dept":"Engineering","count":2},{"dept":"Marketing","count":2}]`
- `orderMatters`: `false`
- `difficulty`: `3`

### `groupby/002.json`（id: 7）

- 問題: 「部署ごとの年齢合計を取得してください。」
- SQL例: `SELECT dept, SUM(age) FROM users GROUP BY dept;`
- `expectedResult`: `[{"dept":"Sales","total_age":40},{"dept":"Engineering","total_age":63},{"dept":"Marketing","total_age":60}]`
- `orderMatters`: `false`
- `difficulty`: `3`

（`expectedResult`のJSONキー名は`judge`が値のみで比較するため任意の名前で良いが、可読性のためSQLのAS句と対応する名前を付けている）

## ファイル構成と`packages/problems/index.ts`の更新

既存の1問1ファイルパターンを踏襲する:

```
packages/problems/
  where/001.json + 001.test.ts（既存、変更なし）
  where/002.json + 002.test.ts（新規）
  where/003.json + 003.test.ts（新規）
  orderby/001.json + 001.test.ts（新規）
  orderby/002.json + 002.test.ts（新規）
  groupby/001.json + 001.test.ts（新規）
  groupby/002.json + 002.test.ts（新規）
  index.ts（更新: 全7問をimport・export）
  index.test.ts（更新: 7問になったことを検証）
```

```ts
import { parseProblem, type Problem } from "@sql-practice/shared";
import where001 from "./where/001.json";
import where002 from "./where/002.json";
import where003 from "./where/003.json";
import orderby001 from "./orderby/001.json";
import orderby002 from "./orderby/002.json";
import groupby001 from "./groupby/001.json";
import groupby002 from "./groupby/002.json";

export const problems: Problem[] = [
  where001,
  where002,
  where003,
  orderby001,
  orderby002,
  groupby001,
  groupby002,
].map(parseProblem);
```

## テスト計画

各新規問題ファイルについて、既存の`where/001.test.ts`と同じ形式で検証テストを追加する（`parseProblem`を通してJSONを読み込み、`id`・`category`を確認する）。

`packages/problems/index.test.ts`を更新し、`problems`配列の長さが7であること、および新規追加した問題が正しく含まれることを検証する。
