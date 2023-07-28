import "@material/mwc-snackbar/mwc-snackbar.js";
import "@material/web/button/text-button.js";

export async function init({ snackbar }) {
  globalThis.snackbar = snackbar;
}
