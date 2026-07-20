# 複数問題切り替えE2Eテスト 設計書

- 日付: 2026-07-20
- 対象: 実際に問題をクリックで切り替えて動作を検証するPlaywrightテストを追加する（`docs/superpowers/specs/2026-07-19-problem-data-expansion-design.md` の後続）

## 背景・目的

問題選択UI（`ProblemList`）の実装時、問題データが1件しかなかったため「実際に問題を切り替える」動作をE2Eで検証できず、これまで先送りにされてきた。問題データが7件に拡充された今、この設計はその検証テストを追加するところまでを対象とする。

JOIN等の新カテゴリの問題データ追加、視覚的なCSS検証は対象外（後続タスク）。

## スコープ

### 対象

- `e2e/sql-execution.spec.ts` に、問題切り替えの総合テストを1件追加する

### 対象外（後続タスク）

- JOIN・サブクエリ・CTE・Window関数などの新カテゴリの問題データ追加
- 問題一覧の視覚的なデザイン調整（CSS）

## テスト内容

問題1（WHERE, 20歳以上）を解いてから問題2（WHERE, Engineering部署）に切り替え、状態リセット・DB再シード・完了マーク・XP累積を一つの総合テストとして検証する。既存の「永続化・重複防止」テストと同じスタイル（1つのテストで複数の関心事を連続して検証する）を踏襲する。

```ts
test("switching problems resets state, reseeds the DB, and tracks completion independently", async ({ page }) => {
  await page.goto("/");

  const terminal = page.locator(".xterm-helper-textarea");
  await terminal.click();
  await page.keyboard.type("SELECT id, name, age FROM users WHERE age >= 20;");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("judge-result")).toContainText("○");
  await expect(page.getByTestId("xp-status")).toContainText("Lv.1 (10 XP)");

  await page.getByTestId("problem-item-2").click();

  await expect(page.getByTestId("problem-item-2")).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("problem-item-1")).toHaveAttribute("aria-current", "false");
  await expect(page.getByText("Engineeringの部署のユーザーを取得してください。")).toBeVisible();
  await expect(page.getByTestId("judge-result")).toHaveCount(0);
  await expect(page.getByTestId("result-table")).toHaveCount(0);

  await page.locator(".xterm-helper-textarea").click();
  await page.keyboard.type("SELECT id, name, age, dept FROM users WHERE dept = 'Engineering';");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("judge-result")).toContainText("○");
  await expect(page.getByTestId("result-table")).toContainText("Carol");
  await expect(page.getByTestId("result-table")).toContainText("Dave");

  await expect(page.getByTestId("problem-item-1")).toContainText("✓");
  await expect(page.getByTestId("problem-item-2")).toContainText("✓");
  await expect(page.getByTestId("xp-status")).toContainText("Lv.1 (20 XP)");
});
```

`aria-current="false"` のアサーションは、Reactが `aria-current={boolean}` を常に文字列化して出力する挙動（`false`でも属性自体は省略されず`"false"`として出力される）を前提にしている。
