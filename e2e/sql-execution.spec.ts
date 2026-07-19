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
