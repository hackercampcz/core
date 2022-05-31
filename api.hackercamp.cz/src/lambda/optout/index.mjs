import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { accepted, internalError, readPayload, withCORS } from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});
/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const withCORS_ = withCORS(
    ["GET", "POST", "OPTIONS"],
    event.headers["origin"]
  );

  try {
    const { email, year } = readPayload(event);

    await db.send(
      new PutItemCommand({
        TableName: "hc-optouts",
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
    console.error(err);
    return withCORS_(internalError());
  }
}
