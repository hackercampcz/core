import { parse } from "https://deno.land/std/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { sendEmailWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

async function getRegistrations() {
  const result = await dynamo.scan({
    TableName: "registrations",
    ProjectionExpression: "email",
    FilterExpression: "#ts > :ts",
    ExpressionAttributeNames: {
      "#ts": "timestamp",
    },
    ExpressionAttributeValues: {
      ":ts": "2022-05-31T00:00:00.000+02:00",
    },
  });
  return new Set(result.Items.map((x) => x.email));
}

async function getContacts() {
  const result = await dynamo.scan({
    TableName: "contacts",
    ProjectionExpression: "email",
  });
  return result.Items.map((x) => x.email);
}

async function getAttendees() {
  const result = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: "email",
  });
  return result.Items.map((x) => x.email);
}

async function getOptOuts(year = 2022) {
  const result = await dynamo.scan({
    TableName: "optouts",
    ProjectionExpression: "email",
    FilterExpression: "#y = :year",
    ExpressionAttributeNames: {
      "#y": "year",
    },
    ExpressionAttributeValues: {
      ":year": year,
    },
  });
  return new Set(result.Items.map((x) => x.email));
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
  "zuzana.tuckova@heureka.cz",
  "daniel.kessl@applifting.cz",
  "o@ner.cz",
  "dzokic@gmail.com",
  "havryluk@alza.cz",
  "lucie@apify.com",
  "barsukov.kirill@seznam.cz",

  // neexistuje
  "samuel.kozuch@keboola.com",
]);

async function main({ token }) {
  const optOuts = await getOptOuts();
  for (const email of optOuts) ignoreList.add(email);
  const registrations = await getRegistrations();
  for (const email of registrations) ignoreList.add(email);
  const attendees = await getAttendees();
  for (const email of attendees) ignoreList.add(email);
  const contacts = await getContacts();
  const pushContacts = contacts.filter((x) => !ignoreList.has(x));

  // console.log(registrations);
  console.log(pushContacts.length);
  for (const email of pushContacts) {
    await sendEmailWithTemplate({
      token,
      templateId: Template.LastYearHackersPush,
      from: "Hacker Camp Crew <team@hackercamp.cz>",
      to: email,
      data: {},
    });
    console.log(email, "sent");
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config send-last-year-hackers-mails.js
