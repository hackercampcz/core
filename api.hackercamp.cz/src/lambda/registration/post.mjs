import {DynamoDBClient, GetItemCommand, PutItemCommand} from "@aws-sdk/client-dynamodb";
import {marshall, unmarshall} from "@aws-sdk/util-dynamodb";
import crypto from "node:crypto";
import {accepted, getHeader, readPayload, seeOther} from "../http.mjs";
import {sendEmailWithTemplate, Template} from "../postmark.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */
/** @typedef { import("rollbar").Rollbar } Rollbar */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

function getTemplateId(isNewbee, isVolunteer, {referral}) {
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
    const params = new URLSearchParams({id});
    return `https://${process.env["hostname"]}/registrace/?${params}`;
  }
  return `https://${process.env["donut"]}/registrace/`;
}

async function getRegistrationByEmail(email, year) {
  console.log({event: "Get registration by email used", email, year});
  const regResp = db.send(
    new GetItemCommand({
      TableName: "registrations",
      Key: {email: {S: email}, year: {N: year.toString()}}
    })
  );

  if (regResp.Item) {
    console.log({event: "Got registration", registration: regResp.Item});
    return unmarshall(regResp.Item);
  }

  return null;
}

/**
 * @param {APIGatewayProxyEvent} event
 * @param {Rollbar} rollbar
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event, rollbar) {
  let {email, year, firstTime, ...rest} = readPayload(event);

  const existingReg = await getRegistrationByEmail(email, year);
  if (existingReg && !rest.id) {
    return {statusCode: 409, body: "E-mail is already registered."};
  }

  const isNewbee = firstTime === "1";
  email = email.trim().toLowerCase();
  year = parseInt(year, 10);
  rest = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v?.trim()]).filter(([, v]) => Boolean(v)));
  const isVolunteer = rest.ticketType === "volunteer";
  const isHacker = rest.ticketType === "hacker";
  const isPatron = rest.ticketType === "hacker-patron";

  if (
    (isPatron && rest.volunteerArrivalDay === "th")
    || (isVolunteer && rest.company === "google")
  ) {
    // API abuse
    rollbar.warn("Spam", event);
    return {statusCode: 451, body: "fok off"};
  }

  const id = rest.id ?? crypto.randomBytes(20).toString("hex");
  console.log({event: "Put registration", email, year, isNewbee, isVolunteer, ...rest});
  const editUrl = getEditUrl(isNewbee, id);

  await Promise.all([
    db.send(
      new PutItemCommand({
        TableName: "registrations",
        Item: marshall({
          email,
          year,
          firstTime: isNewbee,
          ...rest,
          id,
          timestamp: new Date().toISOString()
        }, {convertEmptyValues: true, removeUndefinedValues: true, convertClassInstanceToMap: true})
      })
    ),
    sendEmailWithTemplate({
      token: process.env["postmark_token"],
      templateId: getTemplateId(isNewbee, isVolunteer, rest),
      data: {editUrl},
      to: email,
      tag: "registration"
    })
  ]);
  if (getHeader(event.headers, "Accept") === "application/json") {
    return accepted({editUrl});
  }
  return seeOther(editUrl);
}
