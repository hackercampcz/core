import { getHeader, withCORS } from "../http.mjs";
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
    getHeader(event?.headers, "Origin")
  );
  switch (event.httpMethod) {
    case "GET":
      return get.handler(event).then((x) => withCORS_(x));
    case "POST":
      return post.handler(event).then((x) => withCORS_(x));
    case "OPTIONS":
      return withCORS_({ statusCode: 204, body: "" });
    default:
      return withCORS_({ statusCode: 405, body: "Method Not Allowed" });
  }
}
