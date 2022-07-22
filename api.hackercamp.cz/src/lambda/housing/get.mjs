import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { response } from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});

/**
 *
 * @param {DynamoDBClient} dynamo
 * @param {number} year
 * @returns {Promise<*>}
 */
async function getAttendees(dynamo, year) {
  const result = await dynamo.send(
    new ScanCommand({
      TableName: "hc-attendees",
      Select: "ALL_ATTRIBUTES",
      FilterExpression: "#y = :y",
      ExpressionAttributeNames: { "#y": "year" },
      ExpressionAttributeValues: marshall({ ":y": year }),
    })
  );
  const housingKeys = new Set([
    "name",
    "slackID",
    "housing",
    "housingPlacement",
    "company",
  ]);
  return result.Items.map((x) => unmarshall(x))
    .map((x) => selectKeys(x, housingKeys))
    .map((x) => Object.assign({ isEditable: true }, x));
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const params = Object.assign({ year: "2022" }, event.queryStringParameters);
  console.log({ method: "GET", params });
  return response(await getAttendees(dynamo, parseInt(params.year, 10)));
}
