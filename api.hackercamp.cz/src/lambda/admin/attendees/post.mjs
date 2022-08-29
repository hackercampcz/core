import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { fetchInvoice } from "../../fakturoid.mjs";
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
 * @param {*} data
 */
async function processRequest(db, data) {
  switch (data.command) {
    // TODO: do something useful
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
