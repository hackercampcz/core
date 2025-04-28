import { roleAuthorization } from "../../lib/auth.js";

async function allowCredentials({next}) {
  const resp = await next();
  resp.headers.set("Access-Control-Allow-Credentials", "true");
  return resp;
}

export const onRequest = [roleAuthorization("admin"), allowCredentials];
