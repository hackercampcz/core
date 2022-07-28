import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { accepted, internalError, readPayload, seeOther } from "../../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

/**
 * @param {DynamoDBClient} db
 * @param {{email: string, year: number}} data
 */
async function optout(db, { email, year }) {
  return db.send(
    new PutItemCommand({
      TableName: "hc-optouts",
      Item: marshall(
        { email, year },
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
    case "optout":
      await optout(db, data.params);
      break;
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
    if (event.headers.Accept === "application/json") {
      return accepted();
    }
    return seeOther();
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
