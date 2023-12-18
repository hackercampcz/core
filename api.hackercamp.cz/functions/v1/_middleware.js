export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const pathAndSearch = `${url.pathname}?${url.search}`;
  const originUrl = new URL(pathAndSearch, env.API_HOST).href;
  // TODO: convert auth cookie to Bearer
  return fetch(originUrl, request);
}
