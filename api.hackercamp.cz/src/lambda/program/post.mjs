import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { getHeader, readPayload, seeOther } from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const data = readPayload(event);
  const sanitizedData = Object.fromEntries(
    Object.entries(data)
      .map(([k, v]) => [k, v?.trim ? v?.trim() : v])
      .filter(([k, v]) => Boolean(v)),
  );

  await dynamo.send(
    new UpdateItemCommand({
      TableName: process.env.db_table_registrations,
      Key: {
        email: { S: data.email },
        year: { N: data.year.toString() },
      },
      UpdateExpression: "SET activity = :activity, activityCrew = :activityCrew, activityPlace = :activityPlace",
      ExpressionAttributeValues: marshall(
        {
          ":activity": sanitizedData.activity,
          ":activityCrew": sanitizedData.activityCrew,
          ":activityPlace": sanitizedData.activityPlace,
        },
        { removeUndefinedValues: true, convertEmptyValues: true },
      ),
    }),
  );
  return seeOther(getHeader(event.headers, "Referer"));
}
