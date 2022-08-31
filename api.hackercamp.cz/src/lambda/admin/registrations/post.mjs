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
      TableName: process.env.db_table_registrations,
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

async function invoiced(db, { registrations, invoiceId }) {
  const { fakturoid_token: token } = process.env;
  const { created_at: invoiced, id } = await fetchInvoice(token, invoiceId);
  for (const key of registrations) {
    console.log({
      event: "Marking registration as invoiced",
      invoiceId,
      ...key,
    });
    await db.send(
      new UpdateItemCommand({
        TableName: process.env.db_table_registrations,
        Key: marshall(key, {
          removeUndefinedValues: true,
          convertEmptyValues: true,
        }),
        UpdateExpression: "SET invoice_id = :invoice_id, invoiced = :invoiced",
        ExpressionAttributeValues: marshall(
          { ":invoice_id": id, ":invoiced": invoiced },
          {
            removeUndefinedValues: true,
            convertEmptyValues: true,
          }
        ),
      })
    );
  }
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
    case "invoiced":
      await invoiced(db, data.params);
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
    if (getHeader(event.headers, "Accept") === "application/json") {
      return accepted();
    }
    return seeOther(getHeader(event.headers, "Referer"));
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
