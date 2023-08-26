import { checkAuthorization } from "../auth.mjs";
import { errorResponse, getHeader, withCORS } from "../http.mjs";
import * as get from "./get.mjs";
import * as post from "./post.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

const rollbar = Rollbar.init({ lambdaName: "housing" });

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function housing(event) {
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
          headers: {},
        });
      default:
        return withCORS_({
          statusCode: 405,
          body: "Method Not Allowed",
        });
    }
  } catch (err) {
    rollbar.error(err);
    return withCORS_(errorResponse(err));
  }
}

export const handler = rollbar.lambdaHandler(housing);
