import { checkAuthorization } from "../auth.mjs";
import { getHeader, unauthorized, withCORS } from "../http.mjs";
import * as get from "./get.mjs";
import * as post from "./post.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const withCORS_ = withCORS(
    ["GET", "POST", "OPTIONS"],
    getHeader(event?.headers, "Origin") ?? "*",
    { allowCredentials: true }
  );
  try {
    switch (event.httpMethod) {
      case "GET":
        await checkAuthorization(event);
        return get.handler(event).then((x) => withCORS_(x));
      case "POST":
        await checkAuthorization(event);
        return post.handler(event).then((x) => withCORS_(x));
      case "OPTIONS":
        return withCORS_({
          statusCode: 204,
          body: "",
          headers: {},
        });
      default:
        return withCORS_({
          statusCode: 405,
          body: "Method Not Allowed",
        });
    }
  } catch (e) {
    console.error(e);
    return withCORS_(
      unauthorized({
        "WWW-Authenticate": `Bearer realm="https://donut.hackercamp.cz/", error="invalid_token"`,
      })
    );
  }
}
