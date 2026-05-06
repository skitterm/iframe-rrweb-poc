import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

/** Parent dev server origin (matches `vite.config.mjs` + test `goto`). */
const parentOrigin = "http://localhost:8080";

/** Synthetic path fulfilled by Playwright routing (same origin as parent). */
const rebuildReplayPath = "/__playwright__/rebuild-replay.html";
const rebuildReplayUrl = `${parentOrigin}${rebuildReplayPath}`;

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

const evaluateSnapshottingCode = () => {
  return new Promise((resolve) => {
    const snapshots = [];

    function captureSnapshot() {
      const sn = globalThis.rrweb.snapshot(document, {});
      snapshots.push(sn);
      setTimeout(() => {
        resolve(snapshots[snapshots.length - 1]);
      }, 2000);
    }

    captureSnapshot();

    window.addEventListener("message", (event) => {
      if (event.origin !== "http://127.0.0.1:8081") return;

      const parentSnapshot = snapshots[snapshots.length - 1];
      const sn = event.data;
      if (sn && parentSnapshot) {
        // find the node and replace it
        parentSnapshot.childNodes[1].childNodes[2].childNodes[3].contentDocument =
          sn;
        parentSnapshot.childNodes[1].childNodes[2].childNodes[3].rootId = sn.id;
      }
    });
  });
};

test("has title", async ({ page }) => {
  await page.goto(`${parentOrigin}/parent/`);
  await injectForkRrwebSnapshot(page);

  const result = await page.evaluate(evaluateSnapshottingCode);
  const outPath = path.join(repoRoot, "test-results", "snapshot-result.json");
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");

  await expect(page).toHaveTitle(/Parent/);

  const context = page.context();
  await context.route(rebuildReplayUrl, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Rebuild replay</title></head><body><h1>Rebuild replay</h1><div id="replay-root"></div></body></html>`,
    });
  });

  const rebuildPage = await context.newPage();
  await rebuildPage.goto(rebuildReplayUrl);
  await injectForkRrwebSnapshot(rebuildPage);
  await rebuildPage.waitForFunction(() => globalThis.rrweb?.rebuild);

  await rebuildPage.evaluate((result) => {
    return new Promise((resolve) => {
      const { rebuild, createCache, createMirror } = globalThis.rrweb;
      console.log("result page", result);
      rebuild(result, {
        doc: document,
        cache: createCache(),
        mirror: createMirror(),
        hackCss: true,
      });
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }, result);
});
