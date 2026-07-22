# 問題データの追加拡充（WHERE/ORDER BY/GROUP BY/JOIN） 設計書

- 日付: 2026-07-22
- 対象: `packages/problems` に問題を6問追加する（`docs/superpowers/specs/2026-07-20-join-problems-design.md` の後続、計9問→15問）

## 背景・目的

現在9問（WHERE3・ORDERBY2・GROUPBY2・JOIN2）あるが、各カテゴリで扱っている構文がまだ薄い（WHEREはAND/OR/IN未収録、ORDER BYはLIMITや複数列未収録、GROUP BYはHAVINGやCOUNT/SUM以外の集計未収録、JOINはINNER JOINのみ）。この設計は、既存カテゴリ内で新しい構文要素をカバーする6問（WHERE1・ORDERBY2・GROUPBY2・JOIN1）を追加し、計15問にするところまでを対象とする。

サブクエリ・CTE・Window関数、新カテゴリの追加、複数問題切り替えE2Eテストへの反映は対象外（後続タスク）。

## スコープ

### 対象

- `packages/problems/where/004.json` + `004.test.ts`（新規）
- `packages/problems/orderby/003.json` + `003.test.ts`（新規）
- `packages/problems/orderby/004.json` + `004.test.ts`（新規）
- `packages/problems/groupby/003.json` + `003.test.ts`（新規）
- `packages/problems/groupby/004.json` + `004.test.ts`（新規）
- `packages/problems/join/003.json` + `003.test.ts`（新規）
- `packages/problems/index.ts` — 新規6問を追加しimport・export（更新）
- `packages/problems/index.test.ts` — 15問になったことの検証（更新）
- `README.md` — 「全9問」の記述を更新（更新）

### 対象外（後続タスク）

- サブクエリ・CTE・Window関数の問題
- 新カテゴリの追加
- 複数問題切り替えE2Eテストへの新規問題の反映（既存のE2Eは問題1・2に固定されており、今回の追加では影響しない）

## 型に関する注意（実PGliteで検証済み、`docs/superpowers/specs/2026-07-19-problem-data-expansion-design.md`の知見を踏襲）

`AVG(INTEGER列)`はPostgreSQLのNUMERIC精度をそのまま文字列で返す（例: `"20.0000000000000000"`）ため、今回もGROUP BY問題ではAVGを避け、`COUNT`・`MAX`を使用する。実PGliteで`COUNT(*)`・`MAX(INTEGER)`とも`number`型で返ることを確認済み。

## 6問の内容（全て実PGliteで実行し、`expectedResult`を検証済み）

### `where/004.json`（id: 10） — IN演算子

- 問題: 「SalesまたはMarketing部署のユーザーを取得してください。」
- 共通シード（`where/002.json`等と同じ6行）を使用
- SQL例: `SELECT id, name, age, dept FROM users WHERE dept IN ('Sales', 'Marketing');`
- `expectedResult`: `[{"id":1,"name":"Alice","age":22,"dept":"Sales"},{"id":2,"name":"Bob","age":18,"dept":"Sales"},{"id":5,"name":"Eve","age":41,"dept":"Marketing"},{"id":6,"name":"Frank","age":19,"dept":"Marketing"}]`
- `orderMatters`: `false`
- `difficulty`: `1`（既存WHERE問題と同じ階層）

### `orderby/003.json`（id: 11） — LIMIT

- 問題: 「年齢が高い上位3人のユーザーを取得してください（年齢の高い順）。」
- 共通シード（6行）を使用
- SQL例: `SELECT id, name, age, dept FROM users ORDER BY age DESC LIMIT 3;`
- `expectedResult`: `[{"id":5,"name":"Eve","age":41,"dept":"Marketing"},{"id":3,"name":"Carol","age":35,"dept":"Engineering"},{"id":4,"name":"Dave","age":28,"dept":"Engineering"}]`
- `orderMatters`: `true`
- `difficulty`: `2`

### `orderby/004.json`（id: 12） — 複数列ORDER BY

- 問題: 「部署名の昇順で、同じ部署内では年齢の高い順に並べて取得してください。」
- 共通シード（6行）を使用
- SQL例: `SELECT id, name, age, dept FROM users ORDER BY dept ASC, age DESC;`
- `expectedResult`: `[{"id":3,"name":"Carol","age":35,"dept":"Engineering"},{"id":4,"name":"Dave","age":28,"dept":"Engineering"},{"id":5,"name":"Eve","age":41,"dept":"Marketing"},{"id":6,"name":"Frank","age":19,"dept":"Marketing"},{"id":1,"name":"Alice","age":22,"dept":"Sales"},{"id":2,"name":"Bob","age":18,"dept":"Sales"}]`
- `orderMatters`: `true`
- `difficulty`: `2`

### `groupby/003.json`（id: 13） — HAVING

`COUNT(*) >= 3`が意味を持つよう、既存の6行シードでは部署あたり最大2人しかいないため、この問題専用の8行シードを使う（`join`問題が独自シードを持つのと同じ扱い）。

```sql
INSERT INTO users VALUES(1,'Alice',22,'Sales');
INSERT INTO users VALUES(2,'Bob',18,'Sales');
INSERT INTO users VALUES(3,'Carol',35,'Engineering');
INSERT INTO users VALUES(4,'Dave',28,'Engineering');
INSERT INTO users VALUES(5,'Eve',41,'Marketing');
INSERT INTO users VALUES(6,'Frank',19,'Marketing');
INSERT INTO users VALUES(7,'Grace',30,'Sales');
INSERT INTO users VALUES(8,'Heidi',26,'Engineering');
```

- 問題: 「所属人数が3人以上の部署を取得してください。」
- SQL例: `SELECT dept, COUNT(*) FROM users GROUP BY dept HAVING COUNT(*) >= 3;`
- `expectedResult`: `[{"dept":"Sales","count":3},{"dept":"Engineering","count":3}]`
- `orderMatters`: `false`
- `difficulty`: `3`

### `groupby/004.json`（id: 14） — MAX

- 問題: 「部署ごとの最高年齢を取得してください。」
- 共通シード（6行）を使用
- SQL例: `SELECT dept, MAX(age) FROM users GROUP BY dept;`
- `expectedResult`: `[{"dept":"Sales","max_age":22},{"dept":"Engineering","max_age":35},{"dept":"Marketing","max_age":41}]`
- `orderMatters`: `false`
- `difficulty`: `3`

### `join/003.json`（id: 15） — LEFT JOIN

`join/001.json`・`002.json`と同じdepartments/usersシードに、部署未所属のユーザー（`dept_id`が`NULL`）を1人追加した専用シードを使う。

```sql
INSERT INTO departments VALUES(1,'Sales');
INSERT INTO departments VALUES(2,'Engineering');
INSERT INTO departments VALUES(3,'Marketing');
INSERT INTO users VALUES(1,'Alice',22,1);
INSERT INTO users VALUES(2,'Bob',18,1);
INSERT INTO users VALUES(3,'Carol',35,2);
INSERT INTO users VALUES(4,'Dave',28,2);
INSERT INTO users VALUES(5,'Eve',41,3);
INSERT INTO users VALUES(6,'Frank',19,3);
INSERT INTO users VALUES(7,'Grace',24,NULL);
```

- 問題: 「部署に所属していないユーザーも含めて、全ユーザーの名前と部署名を取得してください（部署未所属の場合は部署名がNULLになります）。」
- SQL例: `SELECT users.name, departments.name FROM users LEFT JOIN departments ON users.dept_id = departments.id;`
- `expectedResult`: `[{"user_name":"Alice","dept_name":"Sales"},{"user_name":"Bob","dept_name":"Sales"},{"user_name":"Carol","dept_name":"Engineering"},{"user_name":"Dave","dept_name":"Engineering"},{"user_name":"Eve","dept_name":"Marketing"},{"user_name":"Frank","dept_name":"Marketing"},{"user_name":"Grace","dept_name":null}]`
- `orderMatters`: `false`
- `difficulty`: `4`（既存JOIN問題と同じ階層）

（`expectedResult`のJSONキー名は`judge`が値のみで比較するため任意の名前で良いが、可読性のためSQLのAS句と対応する名前を付けている）

## ファイル構成と`packages/problems/index.ts`の更新

既存の1問1ファイルパターンを踏襲する:

```
packages/problems/
  (既存9問、変更なし)
  where/004.json + 004.test.ts（新規）
  orderby/003.json + 003.test.ts（新規）
  orderby/004.json + 004.test.ts（新規）
  groupby/003.json + 003.test.ts（新規）
  groupby/004.json + 004.test.ts（新規）
  join/003.json + 003.test.ts（新規）
  index.ts（更新: 全15問をimport・export）
  index.test.ts（更新: 15問になったことを検証）
```

## テスト計画

- 各新規問題ファイルについて、既存パターンと同じ形式の検証テスト（`parseProblem`を通し`id`・`category`を確認）を追加する。
- `packages/problems/index.test.ts`を更新し、`problems`配列の長さが15であること、`id`が1〜15の連番であること、カテゴリごとの新規idが正しく含まれることを検証する。
- 上記に加えて、`index.test.ts`側のテストは`id`/`category`しか検証しないため、実装フェーズで実PGlite上に各問題のschema/seedを流し込み、上記SQL例の実行結果に対して`judge()`が`true`を返すことを別途スクリプトで確認する（コミット対象外の使い捨て検証）。
- `README.md`の「全9問」を「全15問」に更新する。
