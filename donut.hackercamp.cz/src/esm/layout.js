import "@material/mwc-snackbar/mwc-snackbar.js";
import "@material/mwc-button/mwc-button.js";

export async function init({ snackbar }) {
  globalThis.snackbar = snackbar;
}
