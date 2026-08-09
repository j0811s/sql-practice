#!/usr/bin/env node
// Post-build regression guard for the PWA (vite-plugin-pwa / Workbox) output.
//
// Runs after `vite build` (see package.json's "build" script) and inspects the
// real contents of dist/ so that two failure modes caught during code review
// can never silently ship again:
//
//   1. Workbox's default 2MiB precache size limit silently dropping
//      pglite-*.wasm (~10MB) / pglite-*.data (~6.3MB) from the service
//      worker's precache manifest -- offline SQL execution would then be
//      broken even though the build "succeeds".
//   2. A bare (unresolvable) package-name import specifier ending up in the
//      shipped JS (e.g. a `build.rolldownOptions.external` workaround) --
//      the browser 404s on it at runtime. Invisible to `pnpm test:e2e`
//      because that suite runs against Vite's dev server, never a
//      production build.
//
// No dependencies beyond node:fs / node:path -- this only needs to run once,
// at build time, in this one package.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(scriptDir, "..", "dist");

let hasError = false;

function fail(message) {
  console.error(`  ✗ ${message}`);
  hasError = true;
}

function ok(message) {
  console.log(`  ✓ ${message}`);
}

// ---------------------------------------------------------------------------
// Check 1: sw.js and manifest.webmanifest exist
// ---------------------------------------------------------------------------
console.log("Check 1: dist/sw.js and dist/manifest.webmanifest exist");

const swPath = join(distDir, "sw.js");
const manifestPath = join(distDir, "manifest.webmanifest");

{
  const missing = [];
  if (!existsSync(swPath)) missing.push("dist/sw.js");
  if (!existsSync(manifestPath)) missing.push("dist/manifest.webmanifest");
  if (missing.length > 0) {
    fail(`missing required PWA build output: ${missing.join(", ")}`);
  } else {
    ok("both files present");
  }
}

// ---------------------------------------------------------------------------
// Check 2: sw.js precaches the pglite wasm/data payload
// ---------------------------------------------------------------------------
console.log("Check 2: dist/sw.js precache manifest includes pglite-*.wasm and pglite-*.data");

if (existsSync(swPath)) {
  const swText = readFileSync(swPath, "utf8");
  const hasWasm = /pglite-[A-Za-z0-9]+\.wasm/.test(swText);
  const hasData = /pglite-[A-Za-z0-9]+\.data/.test(swText);
  const missing = [];
  if (!hasWasm) missing.push("pglite-*.wasm");
  if (!hasData) missing.push("pglite-*.data");
  if (missing.length > 0) {
    fail(
      `dist/sw.js precache manifest is missing: ${missing.join(", ")} -- ` +
        `this is almost certainly Workbox's default maximumFileSizeToCacheInBytes ` +
        `(2MiB) silently dropping the pglite payload; check ` +
        `vite.config.ts's workbox.maximumFileSizeToCacheInBytes`,
    );
  } else {
    ok("both pglite-*.wasm and pglite-*.data found in the precache manifest");
  }
} else {
  console.log("  (skipped -- dist/sw.js missing, see Check 1)");
}

// ---------------------------------------------------------------------------
// Check 3: every manifest icon resolves to a real file in dist/
// ---------------------------------------------------------------------------
console.log("Check 3: manifest.webmanifest icons resolve to files in dist/");

if (existsSync(manifestPath)) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    fail(`dist/manifest.webmanifest is not valid JSON: ${err.message}`);
    manifest = null;
  }

  if (manifest) {
    const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
    const missingIcons = [];
    for (const icon of icons) {
      const src = icon && typeof icon.src === "string" ? icon.src : undefined;
      if (src === undefined) continue;
      // src is a root-relative URL like "/icons/icon-192.png"; resolve it
      // against dist/ the same way the browser would resolve it against "/".
      const relPath = src.startsWith("/") ? src.slice(1) : src;
      if (!existsSync(join(distDir, relPath))) {
        missingIcons.push(src);
      }
    }
    if (missingIcons.length > 0) {
      fail(
        `manifest.webmanifest references icon(s) missing from dist/:\n` +
          missingIcons.map((src) => `      - ${src}`).join("\n"),
      );
    } else {
      ok(`all ${icons.length} manifest icon(s) resolve to files in dist/`);
    }
  }
} else {
  console.log("  (skipped -- dist/manifest.webmanifest missing, see Check 1)");
}

// ---------------------------------------------------------------------------
// Check 4: no bare package-name import specifiers in the shipped JS
// ---------------------------------------------------------------------------
console.log("Check 4: no bare import specifiers in dist/**/*.js");

// Matches the specifier string following `from`, `import(`, or
// `importScripts(`, quoted with either ', ", or ` (Rolldown emits dynamic
// imports as backtick template literals, e.g.
// `import(\`./workbox-window.prod.es5-Bd17z0YL.js\`)`). The capture is
// bounded to 200 chars so a mis-anchored match (see below) can't swallow a
// large span of code.
const specifierPattern = /(?:from|import\(|importScripts\()\s*(["'`])((?:(?!\1).){1,200})\1/g;

// Real module specifiers are simple path/URL-like tokens: no whitespace,
// parens, braces, or semicolons. Minified bundles occasionally contain
// arbitrary text ending in the word "from" immediately before a backtick
// that closes an unrelated template literal (e.g. an error message like
// `...File or Blob provided to read from\``) -- the regex above can mistake
// that closing backtick for an opening one. Filter those out as noise
// rather than flagging them as offending specifiers.
function looksLikeSpecifier(spec) {
  return !/[\s(){};]/.test(spec);
}

function isAllowedSpecifier(spec) {
  return (
    spec.startsWith(".") ||
    spec.startsWith("/") ||
    spec.startsWith("http:") ||
    spec.startsWith("https:") ||
    spec.startsWith("data:") ||
    spec.startsWith("blob:")
  );
}

function findJsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      results.push(full);
    }
  }
  return results;
}

const offenders = [];

if (existsSync(distDir)) {
  for (const filePath of findJsFiles(distDir)) {
    const text = readFileSync(filePath, "utf8");
    specifierPattern.lastIndex = 0;
    let match;
    while ((match = specifierPattern.exec(text)) !== null) {
      const spec = match[2];
      if (!looksLikeSpecifier(spec)) {
        // Mis-anchored match. Resume scanning just past the *start* of this
        // match (not its end) so a real specifier that this bogus match
        // spanned over still gets found, instead of being silently skipped.
        specifierPattern.lastIndex = match.index + 1;
        continue;
      }
      if (!isAllowedSpecifier(spec)) {
        offenders.push(`${relative(distDir, filePath)}: ${spec}`);
      }
    }
  }
}

if (offenders.length > 0) {
  fail(
    `found bare/unresolvable import specifier(s) in shipped JS (these 404 in the browser):\n` +
      offenders.map((o) => `      - ${o}`).join("\n"),
  );
} else {
  ok("no bare import specifiers found");
}

// ---------------------------------------------------------------------------
if (hasError) {
  console.error("\nPWA build verification FAILED. See ✗ lines above.");
  process.exit(1);
}

console.log("\nPWA build verification passed.");
