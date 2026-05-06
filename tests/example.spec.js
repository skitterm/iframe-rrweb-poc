import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/** Fork entry (single ESM file, no bare imports) — not the package directory. */
const rrwebSnapshotEsPath = path.join(
  repoRoot,
  "forks",
  "rrweb-snapshot",
  "es",
  "rrweb-snapshot.js",
);

/** Expose fork on `globalThis.rrweb` / `window.rrweb` for `page.evaluate`. */
async function injectForkRrwebSnapshot(page) {
  const libSource = readFileSync(rrwebSnapshotEsPath, "utf8");
  const libDataUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(libSource)}`;

  await page.addScriptTag({
    type: "module",
    content: `import * as rrweb from ${JSON.stringify(libDataUrl)};
globalThis.rrweb = rrweb;`,
  });
}

test("has title", async ({ page }) => {
  await page.goto("http://localhost:8080/parent/");
  await injectForkRrwebSnapshot(page);

  await page.evaluate(() => {
    const snappy = globalThis.rrweb.snapshot(document);
    console.log("snappy", snappy);
    return "b";
  });

  await expect(page).toHaveTitle(/Parent/);
});
