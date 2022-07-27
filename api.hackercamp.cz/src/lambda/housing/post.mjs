import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { accepted, internalError, readPayload, seeOther } from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});

function saveAttendee(dynamo, data) {
  return dynamo.send(
    new UpdateItemCommand({
      TableName: "hc-attendees",
      Key: marshall(selectKeys(data, new Set(["year", "slackID"]))),
      UpdateExpression:
        "SET housing = :housing, housingPlacement = :housingPlacement",
      ExpressionAttributeValues: marshall(
        {
          ":housing": data.housing,
          ":housingPlacement": data.housingPlacement,
        },
        { removeUndefinedValues: true }
      ),
    })
  );
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  try {
    const data = readPayload(event);
    const year = parseInt(data.year, 10);
    console.log({ method: "POST", data });
    for (const item of data.items) {
      await saveAttendee(dynamo, Object.assign({ year }, item));
    }
    if (event.headers.Accept === "application/json") {
      return accepted();
    }
    return seeOther();
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
