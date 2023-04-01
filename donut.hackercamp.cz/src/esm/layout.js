import "@material/mwc-snackbar/mwc-snackbar.js";

export async function init({ snackbar }) {
  globalThis.snackbar = snackbar;
}
