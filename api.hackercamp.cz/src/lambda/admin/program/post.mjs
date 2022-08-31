import {
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
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
      Key: marshall({ _id: event_id, year }),
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {*} data
 */
async function processRequest(db, data) {
  switch (data.command) {
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
    await processRequest(db, data);
    if (getHeader(event.headers, "Accept") === "application/json") {
      return accepted();
    }
    return seeOther();
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
