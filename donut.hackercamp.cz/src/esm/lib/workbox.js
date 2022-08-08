import { Workbox } from "workbox-window/build/workbox-window.prod.mjs";

/** @typedef {import("workbox-window").WorkboxLifecycleWaitingEvent} WorkboxLifecycleWaitingEvent */

const isProduction = () =>
  ["localhost", "127"].indexOf(location.hostname) === -1;

/**
 * @param {function(Workbox): function(WorkboxLifecycleWaitingEvent)} showSkipWaitingPrompt
 */
export function init(showSkipWaitingPrompt) {
  if ("serviceWorker" in navigator && isProduction()) {
    const wb = new Workbox("/sw.js");
    wb.addEventListener("waiting", showSkipWaitingPrompt(wb));
    wb.register().catch((ex) => console.error(ex));
  }
}
