import * as get from "./get.mjs";
import * as post from "./post.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  switch (event.httpMethod) {
    case "GET":
      return get.handler(event);
    case "POST":
      return post.handler(event);
    default:
      return { statusCode: 405, body: "Method Not Allowed" };
  }
}
