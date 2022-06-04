import { render } from "lit-html";

/** @typedef {import("@thi.ng/atom").Atom} Atom */

export function renderScheduler() {
  let uiUpdateId;
  let isFirstUpdate = true;
  return ({ preFirstRender, render }) => {
    if (uiUpdateId) {
      cancelAnimationFrame(uiUpdateId);
      uiUpdateId = null;
    }
    uiUpdateId = requestAnimationFrame(() => {
      if (isFirstUpdate) {
        isFirstUpdate = false;
        preFirstRender();
      }
      render();
    });
  };
}

/**
 * Initializes render loop reacting to state changes.
 * @param {Atom} state
 * @param {HTMLElement} root
 */
export function initRenderLoop(state, root) {
  const scheduleRendering = renderScheduler();
  state.addWatch("render", (id, prev, curr) => {
    const { view } = curr;
    if (typeof view !== "function") return;
    scheduleRendering({
      preFirstRender() {
        root.innerHTML = null;
      },
      render() {
        render(view(curr), root);
      },
    });
  });
}
