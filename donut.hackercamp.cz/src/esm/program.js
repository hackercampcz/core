import { initRenderLoop } from "./lib/renderer.js";
import { html } from "lit-html";
import { defAtom } from "@thi.ng/atom";
import * as rollbar from "./lib/rollbar.js";

const state = defAtom({
  lines: [
    { name: "Mainframe" },
    { name: "Basecamp" },
    { name: "Backend" },
    { name: "Peopleware" },
    { name: "WoodStack" },
    { name: "Doprovodný program" },
  ],
});
const transact = (fn) => state.swap(fn);

/**
 *
 * @param {defAtom} state
 */
function renderTimelaps() {
  const { lines } = state.deref();
  return html`
    <div class="timelapse">
      <h1>Program</h1>
      <div class="timelapse__line">
        ${lines.map(
          (line) => html`
            <div class="timelapse__time">
              <h2>${line.name}</h2>
            </div>
          `
        )}
      </div>
    </div>
  `;
}

export async function main({ rootElement, env }) {
  rollbar.init(env);
  initRenderLoop(state, rootElement);
  renderTimelaps();
}
