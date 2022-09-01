import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { getToken, validateToken } from "@hackercamp/lib/auth.mjs";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import {
  accepted,
  getHeader,
  internalError,
  readPayload,
  seeOther,
} from "../../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

/**
 * @param {DynamoDBClient} db
 * @param {{event_id: string, year: number}} data
 */
function deleteEvent(db, { event_id, year }) {
  console.log({ event: "Delete event", event_id, year });
  return db.send(
    new DeleteItemCommand({
      TableName: process.env.db_table_program,
      Key: marshall(
        { _id: event_id, year },
        { convertEmptyValues: true, removeUndefinedValues: true }
      ),
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {{event_id: string, year: number}} data
 * @param {string} slackID
 */
function approveEvent(db, { event_id, year }, slackID) {
  console.log({ event: "Approve event", event_id, year });
  return db.send(
    new UpdateItemCommand({
      TableName: process.env.db_table_program,
      Key: marshall(
        { _id: event_id, year },
        { convertEmptyValues: true, removeUndefinedValues: true }
      ),
      UpdateExpression: "SET approved = :now, approvedBy = :slackID",
      ExpressionAttributeValues: marshall(
        { ":now": new Date().toISOString(), ":slackID": slackID },
        { convertEmptyValues: true, removeUndefinedValues: true }
      ),
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {{event_id: string, year: number}} data
 */
function editEvent(db, { event_id, year, ...updates }) {
  console.log({ event: "Edit event", event_id, year });
  return db.send(
    new UpdateItemCommand({
      TableName: process.env.db_table_program,
      Key: marshall(
        { _id: event_id, year },
        { convertEmptyValues: true, removeUndefinedValues: true }
      ),
      UpdateExpression:
        "SET title = :title, description = :desc, place = :place, startAt = :startAt, duration = :duration, demands = :demands",
      ExpressionAttributeValues: marshall(
        {
          ":title": updates.title,
          ":desc": updates.description,
          ":place": updates.place,
          ":startAt": updates.startAt,
          ":duration": updates.duration,
          ":demands": updates.demands,
        },
        { convertEmptyValues: true, removeUndefinedValues: true }
      ),
    })
  );
}

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

async function deleteAttendeeEvents(db, { event_id, year, people }) {
  for (const slackID of people) {
    if (!slackID) continue;
    const attendee = await getAttendee(db, slackID, year);
    if (!attendee.events?.length) continue;
    attendee.slackID = slackID;
    attendee.year = year;
    attendee.events = attendee.events?.filter((x) => x._id !== event_id);
    await saveAttendee(db, attendee);
  }
}

/**
 * @param {DynamoDBClient} db
 * @param {*} data
 * @param {string} slackID
 */
async function processRequest(db, data, slackID) {
  switch (data.command) {
    case "approve":
      return approveEvent(db, data.params, slackID);
    case "delete":
      console.log({ event: "Deleting event", event_id: data.params.event_id });
      await deleteAttendeeEvents(db, data.params);
      return deleteEvent(db, data.params);
    case "edit":
      return editEvent(db, data.params);
  }
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
    await processRequest(db, data, submittedBy);
    if (getHeader(event.headers, "Accept") === "application/json") {
      return accepted();
    }
    return seeOther(getHeader(event.headers, "Referer"));
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
