/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ request }) {
  const origin = request.headers.get("Origin")
    ?? request.headers.get("Referer")
    ?? `https://donut.hackercamp.cz/`;
  // For local development we need to relax Cross site security
  const sameSite = origin.includes("localhost")
    ? "None"
    : "Strict";
  const expired = new Date(0).toUTCString();
  const response = Response.redirect("https://donut.hackercamp.cz");
  response.headers.set(
    "Set-Cookie",
    `hc-id=; Expires=${expired}; Domain=hackercamp.cz; Path=/; SameSite=${sameSite}; Secure; HttpOnly`,
  );
  return response;
}
