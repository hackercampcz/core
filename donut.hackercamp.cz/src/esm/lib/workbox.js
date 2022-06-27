import { Workbox } from "workbox-window/build/workbox-window.prod.mjs";

const isProduction = () =>
  ["localhost", "127"].indexOf(location.hostname) === -1;

export function init(showSkipWaitingPrompt) {
  if ("serviceWorker" in navigator && isProduction()) {
    const wb = new Workbox("/assets/esm/sw.js");
    wb.addEventListener("waiting", showSkipWaitingPrompt);
    wb.register().catch((ex) => console.error(ex));
  }
}
