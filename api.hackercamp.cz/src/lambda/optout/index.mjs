import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import {
  accepted,
  errorResponse,
  getHeader,
  readPayload,
  withCORS,
} from "../http.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});
const rollbar = Rollbar.init({ lambdaName: "optout" });

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function optout(event) {
  rollbar.configure({ payload: { event } });
  const withCORS_ = withCORS(
    ["POST", "OPTIONS"],
    getHeader(event?.headers, "Origin") ?? "*"
  );

  try {
    const { email, year } = readPayload(event);

    await db.send(
      new PutItemCommand({
        TableName: "optouts",
        Item: marshall(
          {
            email,
            year: parseInt(year, 10),
            timestamp: new Date().toISOString(),
          },
          {
            convertEmptyValues: true,
            removeUndefinedValues: true,
            convertClassInstanceToMap: true,
          }
        ),
      })
    );
    return withCORS_(accepted());
  } catch (err) {
    rollbar.error(err);
    return withCORS_(errorResponse(err));
  }
}

export const handler = rollbar.lambdaHandler(optout);
