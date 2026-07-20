import { expect, test } from "@playwright/test";

test("executes a SELECT query and shows matching rows", async ({ page }) => {
  await page.goto("/");

  const terminal = page.locator(".xterm-helper-textarea");
  await terminal.click();
  await page.keyboard.type("SELECT id, name, age FROM users WHERE age >= 20;");
  await page.keyboard.press("Enter");

  const table = page.getByTestId("result-table");
  await expect(table).toBeVisible();
  await expect(table).toContainText("Alice");
  await expect(table).toContainText("Carol");
  await expect(table).not.toContainText("Bob");

  const verdict = page.getByTestId("judge-result");
  await expect(verdict).toContainText("○");

  const xpStatus = page.getByTestId("xp-status");
  await expect(xpStatus).toContainText("Lv.1 (10 XP)");
});

test("shows an incorrect verdict for a query that doesn't match the expected result", async ({ page }) => {
  await page.goto("/");

  const terminal = page.locator(".xterm-helper-textarea");
  await terminal.click();
  await page.keyboard.type("SELECT id, name, age FROM users;");
  await page.keyboard.press("Enter");

  const table = page.getByTestId("result-table");
  await expect(table).toBeVisible();
  await expect(table).toContainText("Bob");

  const verdict = page.getByTestId("judge-result");
  await expect(verdict).toContainText("×");

  const review = page.getByTestId("review");
  await expect(review).toContainText("抽出条件が緩すぎるかもしれません");
});

test("persists XP across a reload and does not double-count repeat correct answers", async ({ page }) => {
  await page.goto("/");

  const terminal = page.locator(".xterm-helper-textarea");
  await terminal.click();
  await page.keyboard.type("SELECT id, name, age FROM users WHERE age >= 20;");
  await page.keyboard.press("Enter");

  const xpStatus = page.getByTestId("xp-status");
  await expect(xpStatus).toContainText("Lv.1 (10 XP)");

  await terminal.click();
  await page.keyboard.type("SELECT id, name, age FROM users WHERE age >= 20;");
  await page.keyboard.press("Enter");
  await expect(xpStatus).toContainText("Lv.1 (10 XP)");

  await page.reload();
  await expect(page.getByTestId("xp-status")).toContainText("Lv.1 (10 XP)");
});

test("shows the problem list with the current problem selected", async ({ page }) => {
  await page.goto("/");

  const list = page.getByTestId("problem-list");
  await expect(list).toBeVisible();

  const item = page.getByTestId("problem-item-1");
  await expect(item).toBeVisible();
  await expect(item).toHaveAttribute("aria-current", "true");
});

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
