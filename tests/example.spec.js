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

const evaluateSnapshottingCode = () => {
  return new Promise((resolve) => {
    const snapshots = [];

    function captureSnapshot() {
      const sn = globalThis.rrweb.snapshot(document, {});
      console.dir(sn);
      snapshots.push(sn);
      setTimeout(() => {
        resolve(snapshots[snapshots.length - 1]);
      }, 2000);
    }

    document
      .getElementById("btn-take-snapshot")
      .addEventListener("click", () => {
        document.getElementById("replay-hint").textContent = "";
        captureSnapshot();
      });

    document.getElementById("btn-download").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(snapshots, null, 2)], {
        type: "application/json",
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `rrweb-snapshots-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    document
      .getElementById("btn-rebuild-snapshot")
      .addEventListener("click", () => {
        const last = snapshots[snapshots.length - 1];
        if (!last) {
          document.getElementById("replay-hint").textContent =
            "Take at least one snapshot first.";
          return;
        }
        document.getElementById("replay-hint").textContent = "";

        const iframe = document.getElementById("rebuild-frame");
        const doc = iframe?.contentDocument;
        if (!doc) return;

        rebuild(last, {
          doc,
          cache: createCache(),
          mirror: createMirror(),
          hackCss: true,
        });
      });

    document.getElementById("btn-take-snapshot").click();

    window.addEventListener("message", (event) => {
      if (event.origin !== "http://127.0.0.1:8081") return;

      const parentSnapshot = snapshots[snapshots.length - 1];
      const sn = event.data;
      if (sn && parentSnapshot) {
        // find the node and replace it
        parentSnapshot.childNodes[1].childNodes[2].childNodes[3].contentDocument =
          sn;
        parentSnapshot.childNodes[1].childNodes[2].childNodes[3].rootId = sn.id;
        console.log("parentSnapshot", parentSnapshot);
      }
    });
  });
};

test("has title", async ({ page }) => {
  await page.goto("http://localhost:8080/parent/");
  await injectForkRrwebSnapshot(page);

  const result = await page.evaluate(evaluateSnapshottingCode);
  console.log(result);

  await expect(page).toHaveTitle(/Parent/);
});
