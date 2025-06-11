import "@oddbird/popover-polyfill";

export async function init({ snackbar }) {
  globalThis.snackbar = snackbar;
  globalThis.showSnackbar = showSnackbar;
  globalThis.showPersistentSnackbar = showPersistentSnackbar;

  function showSnackbar(message, timeoutMs = 5000) {
    snackbar.querySelector(".content p").textContent = message;
    snackbar.showPopover();
    if (timeoutMs > 0) {
      setTimeout(() => snackbar.hidePopover(), timeoutMs);
    }
  }

  function showPersistentSnackbar(message) {
    globalThis.showSnackbar(message, -1);
  }
}
