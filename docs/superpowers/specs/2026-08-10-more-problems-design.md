# 問題データの追加（WHERE/GROUP BY/JOIN） 設計書

- 日付: 2026-08-10
- 対象: `packages/problems` に問題を5問追加する（`docs/superpowers/specs/2026-07-22-additional-problems-design.md` の後続、計15問→20問）

## 背景・目的

現在15問（WHERE4・ORDERBY4・GROUPBY4・JOIN3）あり、各カテゴリの`answerQuery`を洗い出すと以下の構文がまだ扱われていない。

- WHERE: `>=` `=` `<` `IN` のみで、複数条件の組み合わせ（AND/OR）や文字列パターンマッチ（LIKE）が未収録
- GROUPBY: `COUNT` `SUM` `MAX` `HAVING` はあるが `MIN` が未収録
- JOIN: 単純JOIN・JOIN+WHERE・LEFT JOINのみで、JOINと集計（GROUP BY）の組み合わせ、JOINと複数列ORDER BYの組み合わせが未収録
- ORDERBY: ASC/DESC/LIMIT/複数列ソートは既に揃っており、優先度は低い

この設計は、既存4カテゴリ内でこれらの未収録構文をカバーする5問（WHERE2・GROUPBY1・JOIN2）を追加し、計20問にするところまでを対象とする。新カテゴリの追加、ORDERBYへの追加は対象外。

## スコープ

### 対象

- `packages/problems/where/005.json` + `005.test.ts`（新規）
- `packages/problems/where/006.json` + `006.test.ts`（新規）
- `packages/problems/groupby/005.json` + `005.test.ts`（新規）
- `packages/problems/join/004.json` + `004.test.ts`（新規）
- `packages/problems/join/005.json` + `005.test.ts`（新規）
- `packages/problems/index.ts` — 新規5問を追加しimport・export（更新）
- `packages/problems/index.test.ts` — 20問になったことの検証（更新）
- `README.md` — 「全15問」の記述を更新（更新）

### 対象外（後続タスク）

- サブクエリ・CTE・Window関数の問題
- 新カテゴリの追加
- ORDERBYカテゴリへの追加（既にASC/DESC/LIMIT/複数列ソートをカバー済みで優先度が低い）
- 複数問題切り替えE2Eテストへの新規問題の反映（既存のE2Eは問題1・2に固定されており、今回の追加では影響しない）

## 型に関する注意（`docs/superpowers/specs/2026-07-19-problem-data-expansion-design.md`の知見を踏襲）

`AVG(INTEGER列)`はPostgreSQLのNUMERIC精度をそのまま文字列で返すため、今回もGROUP BY問題ではAVGを避け`MIN`を使用する。実PGliteで`MIN(age)`・`COUNT(*)`とも`number`型で返ることを確認済み（下記5問全て、実PGliteに実際にスキーマ・シードを流し込んで`answerQuery`を実行し、結果の行・列を確認済み）。

## 5問の内容

### `where/005.json`（id: 16） — AND演算子

- 問題: 「Engineering部署で、かつ25歳以上のユーザーを取得してください。」
- 共通シード（`where/002.json`等と同じ6行、`users(id,name,age,dept)`）を使用
- SQL: `SELECT id, name, age, dept FROM users WHERE dept = 'Engineering' AND age >= 25;`
- 実行結果（実PGliteで確認済み）: `[[3,"Carol",35,"Engineering"],[4,"Dave",28,"Engineering"]]`
- `expectedResult`: `[{"id":3,"name":"Carol","age":35,"dept":"Engineering"},{"id":4,"name":"Dave","age":28,"dept":"Engineering"}]`
- `orderMatters`: `false`
- `difficulty`: `1`（既存WHERE問題と同じ階層）
- `hint`: `["複数条件を組み合わせるにはANDを使います。", "dept列とage列、両方の条件を満たす行を探します。"]`

### `where/006.json`（id: 17） — LIKE演算子

- 問題: 「名前に'e'を含むユーザーを取得してください。」
- 共通シード（6行）を使用
- SQL: `SELECT id, name, age, dept FROM users WHERE name LIKE '%e%';`
- 実行結果（実PGliteで確認済み）: `[[1,"Alice",22,"Sales"],[4,"Dave",28,"Engineering"],[5,"Eve",41,"Marketing"]]`
- `expectedResult`: `[{"id":1,"name":"Alice","age":22,"dept":"Sales"},{"id":4,"name":"Dave","age":28,"dept":"Engineering"},{"id":5,"name":"Eve","age":41,"dept":"Marketing"}]`
- `orderMatters`: `false`
- `difficulty`: `1`
- `hint`: `["LIKE演算子で文字列パターンにマッチする行を探せます。", "%は任意の文字列（0文字以上）を表すワイルドカードです。"]`

### `groupby/005.json`（id: 18） — MIN

- 問題: 「部署ごとの最年少年齢を取得してください。」
- 共通シード（6行）を使用
- SQL: `SELECT dept, MIN(age) FROM users GROUP BY dept;`
- 実行結果（実PGliteで確認済み、`min`列は`number`型）: `[["Marketing",19],["Engineering",28],["Sales",18]]`
- `expectedResult`: `[{"dept":"Sales","min_age":18},{"dept":"Engineering","min_age":28},{"dept":"Marketing","min_age":19}]`（`orderMatters: false`のため行順は問わない）
- `orderMatters`: `false`
- `difficulty`: `3`
- `hint`: `["MIN()は最小値を求める集計関数です。", "GROUP BYと組み合わせて部署ごとの最小値を求めます。"]`

### `join/004.json`（id: 19） — JOIN + GROUP BY + COUNT

- 問題: 「部署ごとの人数を、部署名で取得してください。」
- JOIN用シード（`join/001.json`と同じ、`departments`3行+`users`6行、`dept_id`で連結）を使用
- SQL: `SELECT departments.name, COUNT(*) FROM users JOIN departments ON users.dept_id = departments.id GROUP BY departments.name;`
- 実行結果（実PGliteで確認済み、`count`列は`number`型）: `[["Marketing",2],["Engineering",2],["Sales",2]]`
- `expectedResult`: `[{"dept_name":"Sales","count":2},{"dept_name":"Engineering","count":2},{"dept_name":"Marketing","count":2}]`
- `orderMatters`: `false`
- `difficulty`: `4`（既存JOIN問題と同じ階層）
- `hint`: `["JOINとGROUP BYを組み合わせます。", "部署名（departments.name）でグループ化します。"]`

### `join/005.json`（id: 20） — JOIN + 複数列ORDER BY

- 問題: 「全ユーザーの名前と部署名を、部署名の昇順で、同じ部署内ではユーザー名の昇順に並べて取得してください。」
- JOIN用シード（`join/001.json`と同じ）を使用
- SQL: `SELECT users.name, departments.name FROM users JOIN departments ON users.dept_id = departments.id ORDER BY departments.name ASC, users.name ASC;`
- 部署名だけでソートすると同一部署内の2人（例: Sales内のAlice/Bob）の順序がSQL上不定になるため、`users.name ASC`を第2ソートキーに加えて行順を一意に確定させている（`orderMatters: true`で厳密な行順比較を行うため必須）
- 実行結果（実PGliteで確認済み）: `[["Carol","Engineering"],["Dave","Engineering"],["Eve","Marketing"],["Frank","Marketing"],["Alice","Sales"],["Bob","Sales"]]`
- `expectedResult`: `[{"user_name":"Carol","dept_name":"Engineering"},{"user_name":"Dave","dept_name":"Engineering"},{"user_name":"Eve","dept_name":"Marketing"},{"user_name":"Frank","dept_name":"Marketing"},{"user_name":"Alice","dept_name":"Sales"},{"user_name":"Bob","dept_name":"Sales"}]`
- `orderMatters`: `true`
- `difficulty`: `4`
- `hint`: `["JOINとORDER BYを組み合わせます。", "複数列を指定すると、最初の列が同じ場合に次の列で並べ替えます。"]`

## 既存アーキテクチャへの影響

`packages/shared`の`Problem`型・`parseProblem`のバリデーションに変更はない（既存フィールドのみ使用）。`apps/web`側のコード変更もない（`problems`配列が5件増えるのみ）。

## テスト計画

- `packages/problems/where/005.test.ts` / `006.test.ts` / `groupby/005.test.ts` / `join/004.test.ts` / `join/005.test.ts`（新規） — 既存の同カテゴリのテストと同じ形（`parseProblem`を通し、`id`・`category`・`answerQuery`が空でないことを確認）
- `packages/problems/index.test.ts`（更新） — `toHaveLength(20)`に更新し、ソート済みidの配列アサーションを16〜20まで拡張、新規5問それぞれの`id`/`category`を確認する`it`を追加
- `pnpm test`実行で全テストが緑になることを確認する
