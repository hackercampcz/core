/**
 * @typedef {import("../env.d.ts").Env} Env
 */

/**
 * Proxy request to AWS API Gateway
 * @param {EventContext<Env>} context
 */
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const pathAndSearch = url.pathname + url.search;
  const originUrl = new URL(pathAndSearch, env.API_HOST).href;
  // TODO: convert auth cookie to Bearer
  const originRequest = {
    method: request.method,
    headers: Object.fromEntries(request.headers),
    body: request.body,
  };
  console.log({ originUrl, originRequest });
  return fetch(originUrl, originRequest);
}
