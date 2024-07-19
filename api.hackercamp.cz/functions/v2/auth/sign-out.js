/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ request, env }) {
  const origin = request.headers.get("Origin")
    ?? request.headers.get("Referer")
    ?? `https://${env.HC_DONUT_HOSTNAME}/`;

  // For local development we need to relax Cross site security
  const sameSite = origin.includes("localhost")
    ? "None"
    : "Strict";

  const expired = new Date(0).toUTCString();
  return new Response(null, {
    status: 302,
    headers: {
      "Location": origin,
      "Set-Cookie": `hc-id=; Expires=${expired}; Domain=hackercamp.cz; Path=/; SameSite=${sameSite}; Secure; HttpOnly`,
    },
  });
}
