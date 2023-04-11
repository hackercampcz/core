import { checkAuthorization } from "../authorization.mjs";
import { forbidden, getHeader, unauthorized, withCORS } from "../../http.mjs";
import * as get from "./get.mjs";
import * as post from "./post.mjs";
import Rollbar from "../../rollbar.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

const rollbar = Rollbar.init({ lambdaName: "admin-registrations" });

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function registrations(event) {
  const withCORS_ = withCORS(
    ["GET", "POST", "OPTIONS"],
    getHeader(event?.headers, "Origin") ?? "*",
    { allowCredentials: true }
  );
  try {
    switch (event.httpMethod) {
      case "GET":
        await checkAuthorization(event);
        return await get.handler(event).then((x) => withCORS_(x));
      case "POST":
        await checkAuthorization(event);
        return await post.handler(event).then((x) => withCORS_(x));
      case "OPTIONS":
        return withCORS_({
          statusCode: 204,
          body: "",
        });
      default:
        return withCORS_({
          statusCode: 405,
          body: "Method Not Allowed",
        });
    }
  } catch (err) {
    rollbar.error(err);
    if (err.message === "Unauthorized") return withCORS_(forbidden());
    return withCORS_(
      unauthorized({
        "WWW-Authenticate": `Bearer realm="https://donut.hackercamp.cz/", error="invalid_token"`,
      })
    );
  }
}
export const handler = rollbar.lambdaHandler(registrations);
