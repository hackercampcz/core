import {
  DynamoDBClient,
  UpdateItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import {
  getHeader,
  internalError,
  notFound,
  readPayload,
  response,
  unauthorized,
  unprocessableEntity,
  withCORS,
} from "../http.mjs";
import { sendEmailWithTemplate, Template } from "../postmark.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});
const rollbar = Rollbar.init({ lambdaName: "fakturoid-webhook" });

async function markAsPaid(registrations, paid_at, invoice_id) {
  for (const registration of registrations) {
    console.log({ event: "Marking as paid", ...registration });
    await db.send(
      new UpdateItemCommand({
        TableName: "hc-registrations",
        Key: registration,
        UpdateExpression: "SET paid = :paid",
        ExpressionAttributeValues: marshall({
          ":paid": new Date(paid_at).toISOString(),
        }),
      })
    );
    await sendEmailWithTemplate({
      token: process.env["postmark_token"],
      templateId: Template.RegistrationPaid,
      data: {},
      from: "Hacker Camp Crew <team@hackercamp.cz>",
      to: registration.email,
    });
    console.log({
      event: "Invoice marked as paid",
      invoice_id,
      ...registration,
    });
  }
}

async function markAsCancelled(registrations, paid_at, invoice_id) {
  for (const registration of registrations) {
    console.log({ event: "Marking as canceled", ...registration });
    await db.send(
      new UpdateItemCommand({
        TableName: "hc-registrations",
        Key: registration,
        UpdateExpression: "SET cancelled = :now",
        ExpressionAttributeValues: marshall({
          ":now": new Date(paid_at).toISOString(),
        }),
      })
    );
    console.log({
      event: "Invoice marked as cancelled",
      invoice_id,
      ...registration,
    });
  }
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function fakturoidWebhook(event) {
  const withCORS_ = withCORS(
    ["POST", "OPTIONS"],
    getHeader(event.headers, "Origin")
  );


  try {
    const { token } = event.queryStringParameters;
    if (token !== process.env.TOKEN) {
      return withCORS_(unauthorized());
    }

    const payload = readPayload(event);
    if (payload.event_name !== "invoice_paid") {
      console.log({ event: "Unknown event", payload });
      return withCORS_(unprocessableEntity());
    }

    const { invoice_id, paid_at } = payload;
    const resp = await db.send(
      new ScanCommand({
        TableName: "hc-registrations",
        ProjectionExpression: "email,#y",
        FilterExpression: "invoice_id = :invoice_id",
        ExpressionAttributeValues: marshall({
          ":invoice_id": invoice_id,
        }),
        ExpressionAttributeNames: { "#y": "year" },
      })
    );
    const registrations = resp.Items;
    if (!registrations.length) {
      console.log({ event: "Registrations not found", invoice_id });
      return withCORS_(notFound());
    }

    if (payload.total < 0) {
      await markAsCancelled(registrations, paid_at, invoice_id);
    } else {
      await markAsPaid(registrations, paid_at, invoice_id);
    }
    return withCORS_(response({}));
  } catch (err) {
    rollbar.error(err);
    return withCORS_(internalError());
  }
}

export const handler = rollbar.lambdaHandler(fakturoidWebhook);
