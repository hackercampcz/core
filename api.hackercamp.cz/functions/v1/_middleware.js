export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const pathAndSearch = url.pathname + url.search;
  const originUrl = new URL(pathAndSearch, env.API_HOST).href;
  // TODO: convert auth cookie to Bearer
  const originRequest = {
    method: request.method,
    headers: request.headers,
    body: request.body,
  };
  console.log({ originUrl, originRequest });
  return fetch(originUrl, originRequest);
}
