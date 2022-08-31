import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { getToken, validateToken } from "@hackercamp/lib/auth.mjs";
import crypto from "crypto";
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
        { ":events": data.events },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
}

async function createEvent(dynamo, data) {
  console.log({ event: "Create event", data });
  return dynamo.send(
    new PutItemCommand({
      TableName: process.env.db_table_program,
      Item: marshall(data),
    })
  );
}

const freeStages = new Set(["liback", "lipeep", "liother"]);

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
    data._id = data._id ?? crypto.randomUUID();
    data.year = year;
    delete data.slackID;
    if (freeStages.has(data.lineup)) {
      data.approved = new Date().toISOString();
      data.approvedBy = submittedBy;
    }
    console.log({ method: "POST", data, submittedBy, year });
    const attendee = await getAttendee(dynamo, submittedBy, year);
    if (!attendee) return notFound();
    const events = Array.from(
      new Map(attendee.events?.map((e) => [e._id, e]))
        .set(data._id, data)
        .values()
    ).sort((a, b) => a.proposedTime?.localeCompare(b.proposedTime));
    await saveAttendee(dynamo, { slackID: submittedBy, year, events });
    await createEvent(dynamo, data);
    return seeOther(getHeader(event.headers, "Referer"));
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
