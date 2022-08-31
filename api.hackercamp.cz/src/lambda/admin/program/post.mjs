import {
  DeleteItemCommand,
  DynamoDBClient,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { getToken, validateToken } from "@hackercamp/lib/auth.mjs";
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
 * @param {*} data
 * @param {string} slackID
 */
async function processRequest(db, data, slackID) {
  switch (data.command) {
    case "approve":
      return approveEvent(db, data.params, slackID);
    case "delete":
      return deleteEvent(db, data.params);
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
