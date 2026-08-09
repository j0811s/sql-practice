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

test("every manifest icon is actually servable", async ({ page }) => {
  await page.goto("/");

  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();

  expect(Array.isArray(manifest.icons)).toBe(true);
  expect(manifest.icons.length).toBeGreaterThan(0);

  for (const icon of manifest.icons) {
    const iconResponse = await page.request.get(icon.src);
    expect(iconResponse.status(), `${icon.src} should be servable`).toBe(200);
    // Vite's dev server falls back to index.html (200, text/html) for any
    // unmatched path (SPA appType), so a bare status check would silently
    // pass even for a deleted icon. Assert the content-type is actually an
    // image to catch that case.
    const contentType = iconResponse.headers()["content-type"] ?? "";
    expect(contentType, `${icon.src} should respond with an image, not the SPA fallback`).toMatch(
      /^image\//,
    );
  }
});
