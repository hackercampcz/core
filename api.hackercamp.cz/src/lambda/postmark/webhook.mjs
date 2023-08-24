import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import {
  accepted,
  getHeader,
  internalError,
  readPayload,
  unauthorized,
  withCORS,
} from "../http.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef {import("@pulumi/awsx/classic/apigateway").Request} APIGatewayProxyEvent */
/** @typedef {import("@pulumi/awsx/classic/apigateway").Response} APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});
const rollbar = Rollbar.init({ lambdaName: "postmark-webhook" });

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function postmarkWebhook(event) {
  const withCORS_ = withCORS(
    ["POST", "OPTIONS"],
    getHeader(event.headers, "Origin")
  );
  try {
    const [, token] = getHeader(event.headers, "Authorization").split(" ");
    if (token !== process.env.token) {
      return withCORS_(unauthorized());
    }

    const payload = readPayload(event);
    await db.send(
      new PutItemCommand({
        TableName: process.env.db_table_postmark,
        Item: marshall(payload),
      })
    );

    return withCORS_(accepted());
  } catch (err) {
    rollbar.error(err);
    return withCORS_(internalError());
  }
}

export const handler = rollbar.lambdaHandler(postmarkWebhook);
