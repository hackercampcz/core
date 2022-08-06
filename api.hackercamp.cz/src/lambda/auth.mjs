import { getToken, validateToken } from "@hackercamp/lib/auth.mjs";

export async function checkAuthorization(event) {
  const token = getToken(event.headers);
  const isAuthorized = await validateToken(token, process.env["private_key"]);
  if (!isAuthorized) throw Error("Unauthorized");
}
