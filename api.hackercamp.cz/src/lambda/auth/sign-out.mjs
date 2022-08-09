import { response, withCORS } from "../http.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const origin = event.headers.origin;
  const withCORS_ = withCORS(["GET", "OPTIONS"], origin, {
    allowCredentials: true,
  });

  // For local development we need to relax Cross site security
  const sameSite = origin.includes("localhost") ? "None" : "Strict";
  const expired = new Date(0).toUTCString();
  return withCORS_(
    response("", {
      "Set-Cookie": `hc-id=; Expires=${expired}; Domain=hackercamp.cz; Path=/; SameSite=${sameSite}; Secure; HttpOnly`,
    })
  );
}
