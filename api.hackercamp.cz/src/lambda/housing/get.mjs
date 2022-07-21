import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { response } from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});

/**
 *
 * @param {DynamoDBClient} dynamo
 * @returns {Promise<*>}
 */
async function getAttendees(dynamo) {
  const result = await dynamo.send(
    new ScanCommand({
      TableName: "hc-attendees",
      Select: "ALL_ATTRIBUTES",
    })
  );
  return unmarshall(result.Items);
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  return response(await getAttendees(dynamo));
}
