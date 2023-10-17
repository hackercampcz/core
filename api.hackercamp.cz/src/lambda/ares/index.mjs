import { getCompanyDetails } from "../ares.mjs";
import {
  errorResponse,
  getHeader,
  notFound,
  response,
  withCORS,
} from "../http.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

const rollbar = Rollbar.init({ lambdaName: "ares" });
/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function ares(event) {
  rollbar.configure({ payload: { event } });
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
    return withCORS_(errorResponse(err));
  }
}

export const handler = rollbar.lambdaHandler(ares);
