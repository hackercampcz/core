import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { notFound, response } from "../http.mjs";

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
async function getProgram(dynamo, year) {
  const result = await dynamo.send(
    new ScanCommand({
      TableName: process.env.db_table_program,
      FilterExpression: "#y = :y AND attribute_exists(approved)",
      ExpressionAttributeNames: { "#y": "year" },
      ExpressionAttributeValues: marshall({ ":y": year }),
    })
  );
  return result.Items.map((x) => unmarshall(x));
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const params = Object.assign({ year: "2022" }, event.queryStringParameters);
  console.log({ method: "GET", params });
  const data = await getProgram(dynamo, parseInt(params.year, 10));
  if (!data.length) return notFound();
  return response(data);
}
