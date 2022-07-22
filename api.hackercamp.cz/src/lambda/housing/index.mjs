import { getToken, validateToken } from "@hackercamp/lib/auth.mjs";
import { unauthorized, withCORS } from "../http.mjs";
import * as get from "./get.mjs";
import * as post from "./post.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  console.log(event);
  const withCORS_ = withCORS(
    ["GET", "POST", "OPTIONS"],
    event.headers["origin"],
    {
      allowCredentials: true,
    }
  );
  try {
    const token = getToken(event.headers);
    const isAuthorized = await validateToken(token, process.env["private_key"]);
    if (!isAuthorized) {
      throw Error("Unauthorized");
    }
    switch (event.httpMethod) {
      case "GET":
        return get.handler(event).then((x) => withCORS_(x));
      case "POST":
        return post.handler(event).then((x) => withCORS_(x));
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
  } catch (e) {
    console.error(e);
    return withCORS_(
      unauthorized({
        "WWW-Authenticate": `Bearer realm="https://donut.hackercamp.cz/", error="invalid_token"`,
      })
    );
  }
}
