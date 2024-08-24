import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import crypto from "node:crypto";
import { accepted, getHeader, readPayload, seeOther } from "../http.mjs";
import { sendEmailWithTemplate, Template } from "../postmark.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

const unusedAllstars = new Set([
  "U0293EN5KPF",
  "U029HDHPE8J",
  "U029W65SCTS",
  "U02C9JJP2SJ",
  "U02C3C6GDFG",
  "U02AV7F591U",
  "U02C1NGPURH",
  "U02BG1JAK6G",
  "U02CUMJLJQN",
  "U0296F759JN",
  "U02CKKMCLM8",
  "U0293ELJFQD",
  "U02AV7EN58W",
  "U02AB696S77",
  "U02AE77KAR0",
  "U02DAR21FSP",
  "U02AE77HK3L",
  "U02CP28HDN1",
  "U02C9JJKYVC",
  "U02D5PUDV33",
  "U03SW8VTUDS",
  "U02CVJXS6NA",
  "U0296F8DY2E",
  "U02C1JXJTNK"
]);

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
  let { email, year, firstTime, slackID, ...rest } = readPayload(event);
  const isNewbee = firstTime === "1";
  email = email.trim().toLowerCase();
  year = parseInt(year, 10);
  rest = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v?.trim()]).filter(([, v]) => Boolean(v)));
  const isVolunteer = rest.ticketType === "volunteer";
  const isHacker = rest.ticketType === "hacker";
  const isAllstar = unusedAllstars.has(slackID);
  const id = crypto.randomBytes(20).toString("hex");
  console.log({ event: "Put registration", email, year, isNewbee, isVolunteer, ...rest });
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
          // TODO: make this until the end of June and then for allstars
          // isHacker && !isNewbee ? 6000 : undefined
          ticketPrice: isAllstar ? 6000 : undefined,
          id,
          timestamp: new Date().toISOString()
        }, { convertEmptyValues: true, removeUndefinedValues: true, convertClassInstanceToMap: true })
      })
    ),
    sendEmailWithTemplate({
      token: process.env["postmark_token"],
      templateId: getTemplateId(isNewbee, isVolunteer, rest),
      data: { editUrl },
      to: email,
      tag: "registration"
    })
  ]);
  if (getHeader(event.headers, "Accept") === "application/json") {
    return accepted({ editUrl });
  }
  return seeOther(editUrl);
}
