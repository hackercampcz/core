import { parse } from "https://deno.land/std@0.140.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { sendEmailWithTemplate, Template } from "./postmark.js";

const dynamo = createClient();

async function getRegistrations() {
  const result = await dynamo.scan({
    TableName: "hc-registrations",
    Select: "ALL_ATTRIBUTES",
    FilterExpression: "attribute_exists(paid)",
  });
  return result.Items;
}

async function getAttendees() {
  const result = await dynamo.scan({
    TableName: "hc-attendees",
    Select: "ALL_ATTRIBUTES",
  });
  return result.Items;
}

async function getOptOuts(year = 2022) {
  const result = await dynamo.scan({
    TableName: "hc-optouts",
    ProjectionExpression: "email",
    FilterExpression: "#y = :year",
    ExpressionAttributeNames: {
      "#y": "year",
    },
    ExpressionAttributeValues: {
      ":year": year,
    },
  });
  return result.Items;
}

const ignoreList = new Set([
  // nejde
  "jirisvoboda99@gmail.com",
  // waitinglist
  "radekduha.cz@gmail.com",
  "jiri.opletal@gmail.com",
  "ivan@appsatori.eu",
  "vena.kubik@seznam.cz",
  // doregistrace
  "dita@czechitas.cz",
  "milan.formanek@czechitas.cz",
  "ondrej@liftago.com",
  "jontesek@gmail.com",
]);

const mapping = new Map([["zuzana.tuckova@heureka.cz", "tuckovaz@gmail.com"]]);
const slackMapping = new Map([
  ["tuckovaz@gmail.com", "U02C3C69YBY"],
  ["sladek@contember.com", "U02CUP388JX"],
  ["t.a.annamai@gmail.com", "U0296F6U42E"],
  ["vojtech.toulec@gmail.com", "U02CYALG8JV"],
  ["lucie.burisin@gmail.com", "U02AQTZHD50"],
]);

async function main({ token }) {
  const optOuts = await getOptOuts();
  for (const email of optOuts) ignoreList.add(email);
  const paidRegistrations = await getRegistrations();
  const registrations = paidRegistrations
    .map((x) => x.email)
    .filter((x) => !ignoreList.has(x))
    .map((x) => mapping.get(x) ?? x);
  const attendees = await getAttendees();
  const attendeeMails = new Set(attendees.map((c) => c.email));

  const notOnSlack = registrations.filter((x) => !attendeeMails.has(x));

  console.log(notOnSlack.length);
  for (const email of notOnSlack) {
    await sendEmailWithTemplate({
      token,
      templateId: Template.SlackInvite,
      from: "Hacker Camp Crew <team@hackercamp.cz>",
      to: email,
      data: {},
    });
    console.log(email);
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config send-hackers-mails.js
