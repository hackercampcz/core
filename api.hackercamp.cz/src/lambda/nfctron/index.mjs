import { errorResponse, getHeader, response, withCORS } from "../http.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

const rollbar = Rollbar.init({ lambdaName: "attendees" });

async function getNfcTronData(chipID) {
  const resp = await fetch(
    `https://api.nfctron.com/receipt/v2/${chipID}/transaction`,
    {
      headers: { accept: "application/json" },
      referrer: "https://pass.nfctron.com/",
    }
  );
  return resp.json();
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function attendees(event) {
  const withCORS_ = withCORS(
    ["GET", "OPTIONS"],
    getHeader(event?.headers, "Origin") ?? "*"
  );
  if (event.httpMethod === "OPTIONS") {
    return withCORS_({
      statusCode: 204,
      body: "",
    });
  }
  try {
    const params = Object.assign(event.queryStringParameters);
    console.log({ method: "GET", params });
    if (!params.chipID) {
      return withCORS_({ statusCode: 400, body: "" });
    }
    const data = await getNfcTronData(params.chipID);
    return withCORS_(response(data));
  } catch (err) {
    rollbar.error(err);
    return withCORS_(errorResponse(err));
  }
}

export const handler = rollbar.lambdaHandler(attendees);
