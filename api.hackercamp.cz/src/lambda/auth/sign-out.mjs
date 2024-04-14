import { found, getHeader, withCORS } from "../http.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

const rollbar = Rollbar.init({ lambdaName: "auth-signout" });
/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function signOut(event) {
  rollbar.configure({ payload: { event } });
  const origin = getHeader(event.headers, "Origin")
    ?? getHeader(event.headers, "Referer")
    ?? `https://${process.env.hostname}/`;
  const withCORS_ = withCORS(["GET", "OPTIONS"], origin, {
    allowCredentials: true,
  });

  // For local development we need to relax Cross site security
  const sameSite = origin.includes("localhost")
      || origin.includes("7da2-145-224-120-68.ngrok-free.app")
    ? "None"
    : "Strict";
  const expired = new Date(0).toUTCString();
  return withCORS_(
    found(origin, {
      "Set-Cookie": `hc-id=; Expires=${expired}; Domain=hackercamp.cz; Path=/; SameSite=${sameSite}; Secure; HttpOnly`,
    }),
  );
}

export const handler = rollbar.lambdaHandler(signOut);
