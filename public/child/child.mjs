import { snapshot } from "rrweb-snapshot";

const BACKGROUND_CYCLE_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
];

function cyclePageBackgroundEverySecond() {
  let index = 0;
  const apply = () => {
    const color =
      BACKGROUND_CYCLE_COLORS[index % BACKGROUND_CYCLE_COLORS.length];
    document.documentElement.style.background = color;
    document.body.style.background = color;
    index += 1;
  };
  apply();
  setInterval(apply, 5000);
}

// cyclePageBackgroundEverySecond();

setTimeout(() => {
  const sn = snapshot(document);

  // not ideal to have * for the origin
  window.parent.postMessage(sn, "*");
}, 2000);
