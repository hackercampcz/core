import { stringify } from "./lib/profile.js";

/**
 * Stores serialized profile for a limited time retrieval and encodes the link as a QR code image
 * @param param0
 * @param param0.env
 * @param {HTMLImageElement} param0.qrCodeImg
 * @returns {Promise<void>}
 */
export async function main({ env, qrCodeImg }) {
  const payload = stringify();
  const resp = await fetch("/qr-login/", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: payload
  });
  const { link } = await resp.json();
  qrCodeImg.src += `?${new URLSearchParams({ t: link })}`;
}
