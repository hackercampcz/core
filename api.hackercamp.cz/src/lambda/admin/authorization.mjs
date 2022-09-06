import { authorize, getToken } from "@hackercamp/lib/auth.mjs";

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise<void>}
 */
export async function checkAuthorization(event) {
  const token = getToken(event.headers);
  const privateKey = process.env.private_key;
  const isAuthorized = await authorize("admin", token, privateKey);
  if (!isAuthorized) throw Error("Unauthorized");
}
