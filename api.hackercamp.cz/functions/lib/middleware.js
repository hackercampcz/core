export async function allowCredentials({ next }) {
  const response = await next();
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export async function cors({ request, next }) {
  const response = await next();
  response.headers.set("Access-Control-Allow-Origin", request.headers.get("origin") ?? "*");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}
