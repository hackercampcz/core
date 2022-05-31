import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import crypto from "crypto";
import {
  accepted,
  internalError,
  readPayload,
  seeOther,
  withCORS,
} from "../http.mjs";
import { sendEmailWithTemplate, Template } from "../postmark.mjs";

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
  const withCORS_ = withCORS(
    ["GET", "POST", "OPTIONS"],
    event.headers["origin"]
  );

  try {
    const { email, year, firstTime, ...rest } = readPayload(event);
    const isNewbee = firstTime === "1";
    const id = crypto.randomBytes(20).toString("hex");
    const editUrl = `https://${
      process.env["hostname"]
    }/registrace/?${new URLSearchParams({ id })}`;

    await Promise.all([
      db.send(
        new PutItemCommand({
          TableName: "hc-registrations",
          Item: marshall(
            {
              email,
              year: parseInt(year, 10),
              firstTime: isNewbee,
              ...rest,
              id,
              timestamp: new Date().toISOString(),
            },
            {
              convertEmptyValues: true,
              removeUndefinedValues: true,
              convertClassInstanceToMap: true,
            }
          ),
        })
      ),
      sendEmailWithTemplate({
        token: process.env["postmark_token"],
        templateId: isNewbee
          ? rest.referrer
            ? Template.PlusOneRegistration
            : Template.NewRegistration
          : Template.HackerRegistration,
        data: { editUrl },
        from: "Hacker Camp Crew <team@hackercamp.cz>",
        to: email,
      }),
    ]);
    if (event.headers.Accept === "application/json") {
      return withCORS_(accepted({ editUrl }));
    }
    return withCORS_(seeOther(editUrl));
  } catch (err) {
    console.error(err);
    return withCORS_(internalError());
  }
}
