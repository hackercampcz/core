import { getCompanyDetails } from "../ares.mjs";
import {
  getHeader,
  internalError,
  notFound,
  response,
  withCORS,
} from "../http.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

const rollbar = Rollbar.init({ lambdaName: "ares" });
/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function ares(event) {
  const withCORS_ = withCORS(
    ["GET", "OPTIONS"],
    getHeader(event?.headers, "Origin")
  );
  console.log("QS", event.queryStringParameters);
  const { ico } = event.queryStringParameters;

  try {
    const data = await getCompanyDetails(ico);
    if (!data) return withCORS_(notFound());
    return withCORS_(response(data));
  } catch (err) {
    rollbar.error(err);
    return withCORS_(internalError());
  }
}

export const handler = rollbar.lambdaHandler(ares);
