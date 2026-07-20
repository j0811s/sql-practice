---
name: verify-web-ui
description: Use after making a visual/UI change to apps/web, before claiming it's done. Runs a standalone dev server and screenshots it via the Playwright MCP tools in light, dark, and mobile widths, then cleans up.
---

Automated tests don't catch visual regressions. This is the browser-check recipe used throughout this project's UI work.

## Steps

1. **Start a standalone dev server on a scratch port** (don't reuse 5173 — that's reserved for `pnpm test:e2e`'s webServer and may already be running):
   ```
   cd apps/web && nohup npx vite --port 5190 > /tmp/vite-preview.log 2>&1 &
   ```
   Bump the port if it's taken. Note the PID for cleanup.

2. **Navigate** with the Playwright MCP `browser_navigate` tool to `http://localhost:5190/`. If it errors with "Target page, context or browser has been closed", just call `browser_navigate` again — the browser session sometimes needs a fresh call.

3. **Screenshot each mode** using `browser_run_code_unsafe` (needed for viewport size + dark-mode emulation, which the higher-level MCP tools don't expose):
   ```js
   async (page) => {
     await page.emulateMedia({ colorScheme: 'light' }); // or 'dark'
     await page.setViewportSize({ width: 1280, height: 900 }); // or 390x844 for mobile
     await page.reload();
     await page.waitForTimeout(500);
     await page.screenshot({ path: 'check.png', fullPage: true });
     return 'done';
   }
   ```
   Check at minimum: light desktop, dark desktop, light mobile (390×844). Read each PNG with the Read tool to actually look at it.

4. **Driving the xterm terminal** (this app's SQL input): `.fill()` does **not** work — xterm needs real keystrokes. Click `.xterm-helper-textarea` then use real key events:
   ```js
   await page.locator('.xterm-helper-textarea').click();
   await page.keyboard.type('SELECT 1;');
   await page.keyboard.press('Enter');
   ```
   For copy/paste testing: grant clipboard permissions first (`page.context().grantPermissions(['clipboard-read','clipboard-write'])`); a synthetic `Control+V`/`Meta+V` keypress is unreliable in headless Chromium — dispatch a real paste event instead:
   ```js
   await page.evaluate(() => {
     const el = document.querySelector('.xterm-helper-textarea');
     const data = new DataTransfer();
     data.setData('text/plain', 'SELECT * FROM users;');
     el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
   });
   ```

5. **Clean up before finishing** — this is not optional, screenshots and the server must not leak into the repo or stay running:
   ```
   pkill -f "vite --port 5190"
   rm -f *.png
   rm -f .playwright-mcp/*.yml .playwright-mcp/*.log 2>/dev/null
   rmdir .playwright-mcp 2>/dev/null
   git status --short   # confirm only the intended source files are modified
   ```
