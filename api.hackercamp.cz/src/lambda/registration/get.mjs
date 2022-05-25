import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { response, internalError, withCORS, notFound } from "../http.mjs";

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
  const { id } = event.queryStringParameters;
  try {
    const resp = await db.send(
      new ScanCommand({
        TableName: "hc-registrations",
        Select: "ALL_ATTRIBUTES",
        Limit: 1,
        FilterExpression: "id = :id",
        ExpressionAttributeValues: marshall({ ":id": id }),
      })
    );
    const data = resp.Items.map((x) => unmarshall(x));
    if (!data.length) return withCORS_(notFound());
    return withCORS_(response(data));
  } catch (err) {
    console.error(err);
    return withCORS_(internalError());
  }
}
