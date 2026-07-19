# XP・レベルシステム 設計書

- 日付: 2026-07-19
- 対象: 正解時にXPを付与しレベルを算出、画面に常時表示する（`docs/superpowers/specs/2026-07-19-review-generation-design.md` の後続）

## 背景・目的

`judge()`・`generateReview()`により正誤判定とフィードバックは実装済みだが、正解に対する達成感・継続動機を高める仕組みがない。この設計は、正解時にXPを付与しレベルを算出、画面に常時表示するところまでを対象とする。

レベルアップ時の特別な演出、進捗リセット機能、複数問題選択UIは対象外（後続タスク）。

## スコープ

### 対象

- `apps/web/src/xp/index.ts` — `calculateXp`・`calculateLevel`・`totalXp` の実装
- `apps/web/src/xp/index.test.ts`（新規）
- `apps/web/src/App.tsx` — 完了済み問題IDのlocalStorage永続化、XP・レベルの画面表示
- `e2e/sql-execution.spec.ts` — 正解ケースにXP表示更新のアサーションを追加

### 対象外（後続タスク）

- レベルアップ時の特別な演出・通知（現状1問のみでレベルアップ自体が到達不可能）
- 進捗リセット機能
- 複数問題選択UI
- レビュー生成ロジックの変更

## データモデルと永続化

localStorageに「完了済み問題IDのリスト」を保存し、そこからXP・レベルを都度算出する。XPを直接保存すると二重計上や不整合のリスクがあるため、完了済みIDを単一の情報源（single source of truth）とする。

- キー: `sql-practice:completed-problems`（値: `number[]` のJSON文字列）
- 読み込み失敗・不正な値（配列でない等）の場合は空配列として扱う

## `apps/web/src/xp/index.ts` の純粋関数

```ts
import type { Problem } from "@sql-practice/shared";

export function calculateXp(problem: Problem): number {
  return problem.difficulty * 10;
}

export function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function totalXp(completedIds: number[], problems: Problem[]): number {
  return problems
    .filter((p) => completedIds.includes(p.id))
    .reduce((sum, p) => sum + calculateXp(p), 0);
}
```

localStorageの読み書き自体は純粋関数化しにくいため、`App.tsx` 側で直接扱う（`db/`・`judge/`・`review/`と同様、I/O境界は呼び出し側が持つ既存の方針を踏襲する）。

## App.tsx の変更

- `completedIds: number[]` stateを追加し、マウント時にlocalStorageから読み込む（不正・空なら `[]`）。
- 正解時（`isCorrect === true`）、`problem.id` が `completedIds` に含まれていなければ追加し、localStorageに書き戻す。既に含まれていれば何もしない（問題ごとに初回正解時のみXP付与）。
- `xp = totalXp(completedIds, problems)`、`level = calculateLevel(xp)` を都度算出し、見出しの下に常時表示する: `Lv.{level} ({xp} XP)`、`data-testid="xp-status"` を付与する。

```tsx
useEffect(() => {
  const raw = localStorage.getItem("sql-practice:completed-problems");
  const parsed = raw ? JSON.parse(raw) : [];
  setCompletedIds(Array.isArray(parsed) ? parsed : []);
}, []);
```

正解時の更新は既存の `handleSubmit` 内で行う。表示位置は「見出し → Lv./XP表示 → 問題文 → ターミナル → …」。

## テスト計画

`apps/web/src/xp/index.test.ts` にTDDで以下のケースを実装する:

- `calculateXp`: `difficulty × 10` を返す
- `calculateLevel`: 0〜99XPはLv.1、100〜199XPはLv.2など、閾値の境界を検証する
- `totalXp`: 完了済みIDに対応する問題のXP合計を返す（未完了・存在しないIDは無視する）

`e2e/sql-execution.spec.ts` の正解ケースのテストに、`xp-status`（`data-testid`）が初期値（`Lv.1 (0 XP)`）から更新される（`Lv.1 (10 XP)`）ことのアサーションを追加する。
