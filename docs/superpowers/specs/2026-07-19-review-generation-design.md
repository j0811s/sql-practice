# ルールベースレビュー生成 設計書

- 日付: 2026-07-19
- 対象: 不正解時にルールベースでフィードバック文を生成し画面表示する（`docs/superpowers/specs/2026-07-19-judge-ui-integration-design.md` の後続）

## 背景・目的

`judge()` は正解/不正解の真偽値のみを返し、「なぜ不正解か」を画面に伝える手段がない。この設計は、不正解時にユーザーの実行結果と問題の期待結果の差分を分析し、ルールベースで具体的なフィードバック文を生成・表示するところまでを対象とする。

正解時のフィードバック、SQLテキストのパターン解析、複数問題選択UI、XP・レベルシステムは対象外（後続タスク）。

## スコープ

### 対象

- `apps/web/src/review/index.ts` — `generateReview(actual: TableResult, problem: Problem): string` の実装
- `apps/web/src/review/index.test.ts`（新規）
- `apps/web/src/App.tsx` — 不正解時に `generateReview()` を呼び、結果を画面表示
- `e2e/sql-execution.spec.ts` — 不正解ケースにレビュー文表示のアサーションを追加

### 対象外（後続タスク）

- 正解時のフィードバック
- SQLテキストのパターン解析によるヒント
- 複数のメッセージを同時表示する仕組み（常に1件のみ返す）
- 複数問題選択UI
- XP・レベルシステム

## 設計方針

`judge()`（既存、`apps/web/src/judge/index.ts`）は変更しない。既にレビュー済み・安定稼働中のコードであり、正解/不正解の判定という単一責任を保つ。`review/` 側で独自に `actual` と `problem.expectedResult` を比較し、差分カテゴリを判定する。`judge` と一部ロジックが重複するが、役割が明確に分離される。

## 差分カテゴリとルール（優先順位順）

以下の優先順位で最初に該当したカテゴリのメッセージを1つ返す。列名・列順を無視した値の比較を使う点は `judge` と同じ。

| # | 条件 | メッセージ |
| - | ---- | ---------- |
| A | 列数（1行あたりの値の個数）が期待と異なる | 「SELECTする列の数を確認しましょう」 |
| B | `orderMatters: true` かつ値の集合は一致するが行の順序が違う | 「ORDER BYを確認しましょう」 |
| C | 余分な行のみ存在（不足なし） | 「抽出条件が緩すぎるかもしれません。WHERE句の条件を見直しましょう」 |
| D | 不足行のみ存在（余分なし） | 「抽出条件が厳しすぎるかもしれません。比較演算子や条件を見直しましょう」 |
| E | それ以外（値そのものが違う、または余分・不足が両方ある） | 「結果の値を見直しましょう」 |

行の多重集合の差分（余分/不足）は、`judge` と同様の正規化（値ごとに`JSON.stringify`しソートして結合）で行を比較し、出現回数の差分から算出する。

## インターフェース

```ts
export function generateReview(actual: TableResult, problem: Problem): string;
```

- `judge()`と同じく副作用なしの純粋関数。
- `App.tsx` は `judge()` が `false` を返した場合のみ `generateReview()` を呼び出す（正解時・未実行時はレビュー文を表示しない）。

## App.tsx の変更

- 新しい state `review: string | null` を追加する。
- `handleSubmit` 成功時: `judge()` の結果が `false` のときのみ `generateReview(tableResult, problem)` を呼び、`review` にセットする。正解時・エラー時は `null` に戻す。
- 表示順は「エラー → ○/×判定 → レビュー文（不正解時のみ） → 結果テーブル」。レビュー文には `data-testid="review"` を付与する。

## テスト計画

`apps/web/src/review/index.test.ts` にTDDで以下のケースを実装する:

- 列数不一致 → ルールAのメッセージ
- `orderMatters: true` で値は一致・順序のみ違う → ルールBのメッセージ
- 余分な行のみ → ルールCのメッセージ
- 不足行のみ → ルールDのメッセージ
- 余分・不足が両方、または値そのものが違う → ルールEのメッセージ

`e2e/sql-execution.spec.ts` の既存の不正解ケースに、レビュー文（`data-testid="review"`）が表示されることのアサーションを追加する。
