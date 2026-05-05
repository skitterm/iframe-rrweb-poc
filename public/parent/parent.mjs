import { snapshot, rebuild, createCache, createMirror } from "rrweb-snapshot";

/** @type {import('rrweb-snapshot').serializedNodeWithId[]} */
const snapshots = [];

function captureSnapshot() {
  let nodeForIframe;

  const sn = snapshot(document, {
    onIframeLoad: (iFrameNode, node) => {
      if (!nodeForIframe) {
        nodeForIframe = node;
      }
    },
  });
  setTimeout(() => {
    if (sn) {
      // find the node and replace it
      sn.childNodes[1].childNodes[2].childNodes[3].contentDocument =
        nodeForIframe;
      sn.childNodes[1].childNodes[2].childNodes[3].rootId = sn.id;
      snapshots.push(sn);
    }
  }, 1000);
}

document.getElementById("btn-take-snapshot").addEventListener("click", () => {
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
