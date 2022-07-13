import {
  DynamoDBClient,
  UpdateItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import {
  internalError,
  notFound,
  readPayload,
  response,
  unprocessableEntity,
  withCORS,
} from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const withCORS_ = withCORS(["POST", "OPTIONS"], event.headers["origin"]);

  try {
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
    const registration = resp.Items[0];
    if (!registration) {
      console.log({ event: "Registration not found", invoice_id });
      return withCORS_(notFound());
    }
    await db.send(
      new UpdateItemCommand({
        TableName: "hc-registrations",
        Key: marshall(registration),
        UpdateExpression: "ADD paid :paid",
        ExpressionAttributeValues: marshall({
          ":paid": new Date(paid_at).toISOString(),
        }),
      })
    );
    console.log({
      event: "Invoice marked as paid",
      invoice_id,
      ...registration,
    });
    return withCORS_(response({}));
  } catch (err) {
    console.error(err);
    return withCORS_(internalError());
  }
}
