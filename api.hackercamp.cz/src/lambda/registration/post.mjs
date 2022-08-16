import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import crypto from "crypto";
import {
  accepted,
  getHeader,
  internalError,
  readPayload,
  seeOther,
} from "../http.mjs";
import { sendEmailWithTemplate, Template } from "../postmark.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

function getTemplateId(isNewbee, { referral }) {
  if (isNewbee && !referral) {
    return Template.NewRegistration;
  } else if (isNewbee) {
    return Template.PlusOneRegistration;
  } else {
    return Template.HackerRegistration;
  }
}

function getEditUrl(isNewbee, id) {
  if (isNewbee) {
    const params = new URLSearchParams({ id });
    return `https://${process.env["hostname"]}/registrace/?${params}`;
  }
  return `https://${process.env["donut"]}/registrace/`;
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  try {
    const { email, year, firstTime, ...rest } = readPayload(event);
    const isNewbee = firstTime === "1";
    const id = crypto.randomBytes(20).toString("hex");
    console.log({ event: "Put registration", email, year, isNewbee, ...rest });
    const editUrl = getEditUrl(isNewbee, id);

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
        templateId: getTemplateId(isNewbee, rest),
        data: { editUrl },
        from: "Hacker Camp Crew <team@hackercamp.cz>",
        to: email,
      }),
    ]);
    if (getHeader(event.headers, "Accept") === "application/json") {
      return accepted({ editUrl });
    }
    return seeOther(editUrl);
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
