import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { marshall } from "@aws-sdk/util-dynamodb";
import {
  accepted,
  getHeader,
  internalError,
  readPayload,
  seeOther,
} from "../../http.mjs";
import { sendEmailWithTemplate, Template } from "../../postmark.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

function editAttendee(db, data) {
  console.log({ event: "Save attendee", data });
  return db.send(
    new UpdateItemCommand({
      TableName: process.env.db_table_attendees,
      Key: marshall(
        selectKeys(data, new Set(["year", "slackID"]), ([k, v]) => [
          k,
          k === "year" ? parseInt(v, 10) : v,
        ])
      ),
      UpdateExpression:
        "SET note = :note, nfcTronID = :nfcTronID, edited = :now",
      ExpressionAttributeValues: marshall(
        {
          ":note": data.note,
          ":nfcTronID": data.nfcTronID,
          ":now": new Date().toISOString(),
        },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {*} data
 */
async function processRequest(db, data) {
  switch (data.command) {
    case "edit":
      return editAttendee(db, data.params);
  }
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  try {
    const data = readPayload(event);
    await processRequest(db, data);
    if (getHeader(event.headers, "Accept") === "application/json") {
      return accepted();
    }
    return seeOther(getHeader(event.headers, "Referer"));
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
