import {
  DynamoDBClient,
  ScanCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { response, withCORS } from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});

async function getAttendees(dynamo, year) {
  const result = await dynamo.send(
    new ScanCommand({
      TableName: process.env.db_table_attendees,
      Select: "ALL_ATTRIBUTES",
      FilterExpression: "#y = :y",
      ExpressionAttributeNames: { "#y": "year" },
      ExpressionAttributeValues: marshall({ ":y": year }),
    })
  );
  return result.Items.map((x) => unmarshall(x));
}

async function getAttendee(dynamo, slackID, year) {
  const result = await dynamo.send(
    new GetItemCommand({
      TableName: process.env.db_table_attendees,
      Key: marshall({ slackID, year }),
    })
  );
  return result.Item ? unmarshall(result.Item) : null;
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const withCORS_ = withCORS(
    ["GET", "POST", "OPTIONS"],
    event?.headers?.origin ?? "*"
  );
  if (event.httpMethod === "OPTIONS") {
    return withCORS_({
      statusCode: 204,
      body: "",
    });
  }
  const params = Object.assign({ year: "2022" }, event.queryStringParameters);
  console.log({ method: "GET", params });
  const year = parseInt(params.year, 10);
  if (params.slackID) {
    return withCORS_(response(await getAttendee(dynamo, slackID, year)));
  }
  return response(await getAttendees(dynamo, year));
}
