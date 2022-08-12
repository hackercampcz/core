import { getToken, authorize } from "@hackercamp/lib/auth.mjs";
import { unauthorized, withCORS } from "../../http.mjs";
import * as get from "./get.mjs";
import * as post from "./post.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

async function checkAuthorization(event) {
  const token = getToken(event.headers);
  const privateKey = process.env.private_key;
  const isAuthorized = await authorize("admin", token, privateKey);
  if (!isAuthorized) throw Error("Unauthorized");
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const withCORS_ = withCORS(
    ["GET", "POST", "OPTIONS"],
    event?.headers?.origin ?? "*",
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
