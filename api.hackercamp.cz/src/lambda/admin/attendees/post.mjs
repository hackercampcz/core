import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { marshall } from "@aws-sdk/util-dynamodb";
import { accepted, getHeader, readPayload, seeOther } from "../../http.mjs";
import crypto from "crypto";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

/**
 * @param {DynamoDBClient} db
 * @param {*} data
 */
function editAttendee(db, data) {
  console.log({ event: "Update attendee", data });
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
        "SET #attendeeName = :name, email = :email, note = :note, nfcTronID = :nfcTronID, company = :company, edited = :now, editedBy = :editedBy",
      ExpressionAttributeValues: marshall(
        {
          ":name": data.name,
          ":email": data.email,
          ":note": data.note,
          ":nfcTronID": data.nfcTronID,
          ":company": data.company,
          ":now": new Date().toISOString(),
          ":editedBy": data.editedBy,
        },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
      ExpressionAttributeNames: {
        "#attendeeName": "name",
      },
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {*} data
 */
function addAttendee(db, data) {
  const id = `hc-${crypto.randomUUID()}`;
  const attendee = {
    ...data,
    year: parseInt(data.year, 10),
    slackID: id,
    slug: id,
  };
  console.log({ event: "Put attendee", attendee });

  return db.send(
    new PutItemCommand({
      TableName: process.env.db_table_attendees,
      Item: marshall(
        { ...attendee },
        {
          convertEmptyValues: true,
          removeUndefinedValues: true,
        }
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
    case "add":
      return addAttendee(db, data.params);
  }
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const data = readPayload(event);
  await processRequest(db, data);
  if (getHeader(event.headers, "Accept") === "application/json") {
    return accepted();
  }
  return seeOther(getHeader(event.headers, "Referer"));
}
