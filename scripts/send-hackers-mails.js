import { parse } from "https://deno.land/std/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { sendEmailWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

async function getPaidRegistrations(year) {
  const result = await dynamo.scan({
    TableName: "registrations",
    ProjectionExpression: "email",
    FilterExpression: "attribute_exists(invoiced) AND attribute_not_exists(cancelled) AND #year = :year",
    ExpressionAttributeNames: {
      "#year": "year",
    },
    ExpressionAttributeValues: {
      ":year": year,
    },
  });
  return result.Items.map((x) => x.email);
}

async function getThisYearRegistrations(year) {
  const result = await dynamo.scan({
    TableName: "registrations",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year",
    ExpressionAttributeNames: {
      "#year": "year",
    },
    ExpressionAttributeValues: {
      ":year": year,
    },
  });
  return result.Items.map((x) => x.email);
}

async function getAttendees(year) {
  const result = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year",
    ExpressionAttributeNames: {
      "#year": "year",
    },
    ExpressionAttributeValues: {
      ":year": year,
    },
  });
  return result.Items.map((x) => x.email);
}

async function getOptOuts(year) {
  const result = await dynamo.scan({
    TableName: "optouts",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year",
    ExpressionAttributeNames: {
      "#year": "year",
    },
    ExpressionAttributeValues: {
      ":year": year,
    },
  });
  return result.Items.map((x) => x.email);
}

const ignoreList = new Set();

async function getContacts() {
  const result = await dynamo.scan({
    TableName: "contacts",
    ProjectionExpression: "email",
  });
  return result.Items.map((x) => x.email);
}

async function main({ token }) {
  const year = new Date().getFullYear();
  const optOuts = await getOptOuts(year);
  for (const email of optOuts) ignoreList.add(email);
  const contacts = await getContacts();
  const thisYearRegistrations = await getThisYearRegistrations(year);
  for (const email of thisYearRegistrations) ignoreList.add(email);
  // const attendees = await getAttendees(year);
  // const paidRegistrations = await getPaidRegistrations(year);
  const coldHackers = new Set(contacts.filter((x) => !ignoreList.has(x)));

  console.log(coldHackers.size);
  // return;
  for (const email of coldHackers) {
    console.log(`"${email}",`);
    await sendEmailWithTemplate({
      token,
      templateId: Template.HackerPush,
      from: "Hacker Camp Crew <team@hackercamp.cz>",
      to: email,
      data: {},
    });
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config send-hackers-mails.js --token $(op read 'op://HackerCamp/Postmark/credential')
