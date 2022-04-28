import { validateToken } from "@hackercamp/lib/auth.mjs";
import { response, unauthorized, withCORS } from "../http.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

function getToken(event) {
  console.log({ event });
  return undefined;
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const withCORS_ = withCORS(["POST", "OPTIONS"], event.headers["origin"]);
  const token = getToken(event);
  if (!validateToken(token, process.env["private_key"])) {
    return withCORS_(unauthorized());
  }
  return withCORS_(response("OK"));
}
