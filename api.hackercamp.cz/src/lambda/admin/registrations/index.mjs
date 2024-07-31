import { JWTInvalid } from "jose/dist/node/esm/util/errors.js";
import { errorResponse, getHeader, unauthorized, withCORS } from "../../http.mjs";
import Rollbar from "../../rollbar.mjs";
import { checkAuthorization } from "../authorization.mjs";
import * as get from "./get.mjs";
import * as post from "./post.mjs";

/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

const rollbar = Rollbar.init({ lambdaName: "admin-registrations" });

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function registrations(event) {
  rollbar.configure({ payload: { event } });
  const withCORS_ = withCORS(
    ["GET", "POST", "OPTIONS"],
    getHeader(event?.headers, "Origin") ?? "*",
    { allowCredentials: true },
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
    if ((err instanceof JWTInvalid) || err.message === "Unauthorized") {
      return withCORS_(unauthorized());
    }
    rollbar.error(err);
    return withCORS_(errorResponse(err));
  }
}
export const handler = rollbar.lambdaHandler(registrations);
