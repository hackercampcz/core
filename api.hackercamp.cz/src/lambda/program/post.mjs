import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { getToken, validateToken } from "@hackercamp/lib/auth.mjs";
import {
  getHeader,
  internalError,
  notFound,
  readPayload,
  seeOther,
} from "../http.mjs";
import { postChatMessage } from "../slack.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});

async function getAttendee(dynamo, slackID, year) {
  console.log({ event: "Get attendee", slackID, year });
  const result = await dynamo.send(
    new GetItemCommand({
      TableName: process.env.db_table_attendees,
      ProjectionExpression: "events",
      Key: marshall(
        { slackID, year },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
  return result.Item ? unmarshall(result.Item) : null;
}

function saveAttendee(dynamo, data) {
  console.log({ event: "Save attendee", data });
  return dynamo.send(
    new UpdateItemCommand({
      TableName: process.env.db_table_attendees,
      Key: marshall(selectKeys(data, new Set(["year", "slackID"]))),
      UpdateExpression: "SET events = :events",
      ExpressionAttributeValues: marshall(
        {
          ":events": data.events,
        },
        { removeUndefinedValues: true, convertEmptyValues: true }
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
    const submittedBy = payload["https://slack.com/user_id"];
    const year = parseInt(data.year, 10);
    delete data.year;
    console.log({ method: "POST", data, submittedBy, year });
    const attendee = await getAttendee(dynamo, submittedBy, parseInt(year, 10));
    if (!attendee) return notFound();
    const events = new Map(attendee.events?.map((e) => [e.id, e]))
      .set(data.id, data)
      .values();
    await saveAttendee(dynamo, { slackID: submittedBy, year, events });
    return seeOther(getHeader(event.headers, "Referer"));
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
