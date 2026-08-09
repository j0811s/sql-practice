import { expect, test } from "@playwright/test";

test("registers a web app manifest and a service worker", async ({ page }) => {
  await page.goto("/");

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(manifestHref).toBe("/manifest.webmanifest");

  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration !== undefined;
        }),
      { timeout: 10000 },
    )
    .toBe(true);
});
