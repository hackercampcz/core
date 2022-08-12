import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { accepted, internalError, readPayload, seeOther } from "../../http.mjs";
import { sendEmailWithTemplate, Template } from "../../postmark.mjs";

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
      TableName: process.env.db_table_optouts,
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

async function approve(db, { email, year, referral }) {
  return db.send(
    new UpdateItemCommand({
      TableName: process.env.db_table_attendees,
      Key: marshall(
        { email, year },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
      UpdateExpression: "SET referral = :referral",
      ExpressionAttributeValues: marshall({
        ":referral": referral,
      }),
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
    case "approve":
      await approve(db, data.params);
      await sendEmailWithTemplate({
        token: process.env.postmark_token,
        templateId: Template.HackerApproved,
        data: {},
        from: "Hacker Camp Crew <team@hackercamp.cz>",
        to: data.params.email,
      });
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
