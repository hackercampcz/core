import { getToken, authorize } from "@hackercamp/lib/auth.mjs";
import { unauthorized, withCORS } from "../../http.mjs";
import * as get from "./get.mjs";
import * as post from "./post.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  try {
    const isAuthorized = await authorize(
      "admin",
      getToken(event.headers),
      process.env["private_key"]
    );
    if (!isAuthorized) {
      throw Error("Unauthorized");
    }
    switch (event.httpMethod) {
      case "GET":
        return get.handler(event);
      case "POST":
        return post.handler(event);
      case "OPTIONS":
        return withCORS(["GET", "POST", "OPTIONS"])({
          statusCode: 204,
          body: "",
        });
      default:
        return withCORS(["GET", "POST", "OPTIONS"])({
          statusCode: 405,
          body: "Method Not Allowed",
        });
    }
  } catch (e) {
    console.error(e);
    return withCORS(["GET", "POST", "OPTIONS"])(
      unauthorized({
        "WWW-Authenticate": `Bearer realm="https://donut.hackercamp.cz/", error="invalid_token"`,
      })
    );
  }
}
