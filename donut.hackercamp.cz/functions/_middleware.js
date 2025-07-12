import { getToken, validateToken } from "@hackercamp/lib/auth.js";

const openRoutes = [new URLPattern({ pathname: "/program/kalendar" })];
const authorizedOnly = [
  new URLPattern({ pathname: "/hackers/*" }),
  new URLPattern({ pathname: "/registrace/*" }),
  new URLPattern({ pathname: "/ubytovani/*" }),
  new URLPattern({ pathname: "/program/*" }),
  new URLPattern({ pathname: "/admin/*" })
];

/**
 * @param {EventContext<Env>} context
 */
export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  if (openRoutes.some(x => x.test(url))) return next();
  if (!authorizedOnly.some(x => x.test(url))) return next();

  const token = getToken(request.headers);
  const isValidToken = await validateToken(token, env.HC_JWT_SECRET);
  console.log("Authorization", request.url, Boolean(isValidToken));

  if (isValidToken) return next();

  const query = new URLSearchParams({ state: "not-authenticated", returnUrl: request.url });
  return Response.redirect(`https://${env.HC_DONUT_HOSTNAME}/?${query}`, 307);
}
