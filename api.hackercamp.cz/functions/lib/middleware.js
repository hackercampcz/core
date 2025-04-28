export async function allowCredentials({ next }) {
  const resp = await next();
  resp.headers.set("Access-Control-Allow-Credentials", "true");
  return resp;
}

export async function cors({ next }) {
  const response = await next();
  response.headers.set("Access-Control-Allow-Origin", context.request.headers.get("origin") ?? "*");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}
