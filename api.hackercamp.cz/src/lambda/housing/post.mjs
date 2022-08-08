import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { getToken, validateToken } from "@hackercamp/lib/auth.mjs";
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
    const token = getToken(event.headers);
    const payload = await validateToken(token, process.env.private_key);
    console.dir(payload, { depth: 10 });
    const year = parseInt(data.year, 10);
    console.dir({ method: "POST", data }, { depth: 10 });
    for (const item of data.items) {
      await saveAttendee(dynamo, Object.assign({ year }, item));
      // TODO: send Slack message
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
