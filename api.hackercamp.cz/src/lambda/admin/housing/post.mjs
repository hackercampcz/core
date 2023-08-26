import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { accepted, getHeader, readPayload, seeOther } from "../../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

/**
 * @param {DynamoDBClient} db
 * @param {*} data
 */
async function processRequest(db, data) {
  switch (
    data.command
    // TODO: do something useful
  ) {
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
