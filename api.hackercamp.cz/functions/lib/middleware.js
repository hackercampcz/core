import { authorize, getToken, validateToken } from "./auth.js";

export async function allowCredentials({ next }) {
  const response = await next();
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export function allowMethods(methods) {
  return async ({ next }) => {
    const response = await next();
    response.headers.set("Access-Control-Allow-Methods", methods?.join(", ") ?? "GET, OPTIONS");
    return response;
  };
}

export async function gracefulOptions(context) {
  const { request, next } = context;

  // Handle CORS preflight without forwarding to the route handler
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
    });
  }

  // For all other methods, proceed to the route handler
  return next();
}

export async function cors({ request, next }) {
  const response = await next();
  response.headers.set("Access-Control-Allow-Origin", request.headers.get("origin") ?? "*");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export async function authorization({ request, env, next }) {
  const token = getToken(request.headers);
  const pkey = env.private_key;
  console.log({ event: "check-authorization", token, pkey });
  const isAuthorized = await validateToken(token, pkey);
  if (!isAuthorized) return new Response(null, { status: 401 });
  return next();
}

export function roleAuthorization(role) {
  /**
   * @param {EventContext<Env>} context
   */
  return async function authorization({ request, next, env }) {
    const token = getToken(request.headers);
    const privateKey = env.HC_JWT_SECRET;
    const isAuthorized = await authorize(role, token, privateKey);

    if (isAuthorized) return next();

    const query = new URLSearchParams({ returnUrl: request.url });
    return Response.redirect(`https://${env.HC_DONUT_HOSTNAME}/?${query}`, 307);
  };
}
