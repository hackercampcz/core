import "@material/mwc-snackbar/mwc-snackbar.js";

export async function init({ snackbar }) {
  globalThis.snackbar = snackbar;
  globalThis.showSnackbar = showSnackbar;
  globalThis.showPersistentSnackbar = showPersistentSnackbar;

  function showSnackbar(message) {
    snackbar.labelText = message;
    snackbar.show();
  }

  function showPersistentSnackbar(message) {
    snackbar.timeoutMs = -1;
    globalThis.showSnackbar(message);
  }
}
