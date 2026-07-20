# 複数問題切り替えE2Eテスト Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 実際に問題をクリックで切り替える動作を検証するPlaywright E2Eテストを追加する。

**Architecture:** 既存の `e2e/sql-execution.spec.ts` に、問題1を解いてから問題2に切り替え、状態リセット・DB再シード・完了マーク・XP累積を検証する総合テストを1件追加する。

**Tech Stack:** Playwright（既存構成のまま。新規依存パッケージなし）

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-07-20-problem-switching-e2e-design.md`（承認済み）
- 対象外（本計画では実装しない）: JOIN・サブクエリ・CTE・Window関数などの新カテゴリの問題データ追加、問題一覧の視覚的なデザイン調整（CSS）

---

### Task 1: e2e — 問題切り替えの総合テストを追加する

**Files:**
- Modify: `e2e/sql-execution.spec.ts`

**Interfaces:**
- Consumes: 既存の `App.tsx`・`ProblemList`・`judge`・`xp` の実装（変更なし）
- Produces: なし（テストの追加がこのタスクのゴール）

- [ ] **Step 1: `e2e/sql-execution.spec.ts` の末尾にテストを追加する**

現在のファイルの末尾（最後の `});` の直後）に以下のテストを追加する:

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

- [ ] **Step 2: ユニットテスト・ビルドが通ることを確認する**

```bash
pnpm test
pnpm build
```

Expected: 両方成功（このタスクはE2Eテストのみの追加なので、ユニットテスト・ビルド結果に変化はない）

- [ ] **Step 3: E2Eテストが通ることを確認する**

```bash
pnpm test:e2e
```

Expected: `5 passed`

- [ ] **Step 4: コミットする**

```bash
git add e2e
git commit -m "test: add e2e coverage for switching between problems"
```

---
