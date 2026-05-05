import { snapshot, rebuild, createCache, createMirror } from "rrweb-snapshot";

const snapshots = [];

function captureSnapshot() {
  const sn = snapshot(document, {});

  snapshots.push(sn);
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
