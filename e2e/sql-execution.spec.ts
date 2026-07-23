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

test("reveals a shuffled word puzzle after both hint levels and inserts clicks into the terminal", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByTestId("hint-reveal").click();
  await expect(page.getByTestId("hint-text")).toBeVisible();

  await page.getByTestId("hint-more-reveal").click();
  const puzzle = page.getByTestId("hint-puzzle");
  await expect(puzzle).toBeVisible();

  const wordButtons = puzzle.locator(".hint-word");
  await expect(wordButtons).toHaveCount(10);

  const clickWord = async (word: string) => {
    // Locate via the ":not([disabled])" filter only to pick the button, since duplicate words
    // (e.g. "age" appears twice) need to resolve to whichever instance is still enabled. Capture
    // its stable data-testid before clicking, then re-locate by that testid (without the disabled
    // filter) to assert the disabled state — re-querying ".hint-word:not([disabled])" after the
    // click would no longer match the now-disabled element and fail with "element(s) not found".
    const button = puzzle.locator(".hint-word:not([disabled])").filter({ hasText: word }).first();
    const testId = await button.getAttribute("data-testid");
    expect(testId).not.toBeNull();
    await button.click();
    await expect(puzzle.getByTestId(testId!)).toBeDisabled();
  };

  for (const word of ["SELECT", "id,", "name,", "age", "FROM", "users", "WHERE", "age", ">=", "20;"]) {
    await clickWord(word);
  }

  await page.locator(".xterm-helper-textarea").click();
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("judge-result")).toContainText("○");
  await expect(page.getByTestId("result-table")).toContainText("Alice");
  await expect(page.getByTestId("result-table")).toContainText("Carol");
});
