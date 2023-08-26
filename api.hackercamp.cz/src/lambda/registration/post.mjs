import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import crypto from "crypto";
import { accepted, getHeader, readPayload, seeOther } from "../http.mjs";
import { sendEmailWithTemplate, Template } from "../postmark.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

function getTemplateId(isNewbee, isVolunteer, { referral }) {
  if (isVolunteer) {
    // TODO: registration confirmation mail for volunteers
    return null;
  }
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
  let { email, year, firstTime, ...rest } = readPayload(event);
  const isNewbee = firstTime === "1";
  email = email.trim().toLowerCase();
  year = parseInt(year, 10);
  rest = Object.fromEntries(
    Object.entries(rest)
      .map(([k, v]) => [k, v?.trim()])
      .filter(([, v]) => Boolean(v))
  );
  const isVolunteer = rest.ticketType === "volunteer";
  const id = crypto.randomBytes(20).toString("hex");
  console.log({
    event: "Put registration",
    email,
    year,
    isNewbee,
    isVolunteer,
    ...rest,
  });
  const editUrl = getEditUrl(isNewbee, id);

  await Promise.all([
    db.send(
      new PutItemCommand({
        TableName: "hc-registrations",
        Item: marshall(
          {
            email,
            year,
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
      templateId: getTemplateId(isNewbee, isVolunteer, rest),
      data: { editUrl },
      from: "Hacker Camp Crew <team@hackercamp.cz>",
      to: email,
    }),
  ]);
  if (getHeader(event.headers, "Accept") === "application/json") {
    return accepted({ editUrl });
  }
  return seeOther(editUrl);
}
