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
        "SET #attendeeName = :name, email = :email, note = :note, company = :company, edited = :now, editedBy = :editedBy",
      ExpressionAttributeValues: marshall(
        {
          ":name": data.name,
          ":email": data.email,
          ":note": data.note,
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
async function checkIn(db, data) {
  console.log({ event: "Attendee check-in", data });
  return db.send(
    new UpdateItemCommand({
      TableName: process.env.db_table_attendees,
      Key: {
        year: { N: data.year.toString() },
        slackID: { S: data.slackID },
      },
      UpdateExpression:
        "SET checkIn = :checkIn, checkInBy = :checkInBy, checkInNote = :checkInNote, nfcTronData = :nfcTronData",
      ExpressionAttributeValues: marshall(
        {
          ":checkIn": new Date().toISOString(),
          ":checkInBy": data.admin,
          ":checkInNote": data.note,
          ":nfcTronData": data.nfcTronData,
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
async function checkOut(db, data) {
  console.log({ event: "Attendee check-out", data });
  return db.send(
    new UpdateItemCommand({
      TableName: process.env.db_table_attendees,
      Key: {
        year: { N: data.year.toString() },
        slackID: { S: data.slackID },
      },
      UpdateExpression:
        "SET checkout = :checkOut, checkOutBy = :checkOutBy, checkOutNote = :checkOutNote, checkOutPaid = :checkOutPaid, checkOutTotal = :checkOutTotal",
      ExpressionAttributeValues: marshall(
        {
          ":checkOut": new Date().toISOString(),
          ":checkOutBy": data.admin,
          ":checkOutNote": data.note,
          ":checkOutPaid": data.paid,
          ":checkOutTotal": data.amount,
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
    case "add":
      return addAttendee(db, data.params);
    case "checkIn":
      return checkIn(db, data.params);
    case "checkOut":
      return checkOut(db, data.params);
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
