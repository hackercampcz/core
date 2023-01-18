import { parse } from "https://deno.land/std@0.140.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { sendEmailWithTemplate, Template } from "./postmark.js";

const dynamo = createClient();

async function getPaidRegistrations() {
  const result = await dynamo.scan({
    TableName: "hc-registrations",
    ProjectionExpression: "email",
    FilterExpression:
      "attribute_exists(invoiced) AND attribute_not_exists(cancelled)",
  });
  return result.Items.map((x) => x.email);
}

async function getAttendees() {
  const result = await dynamo.scan({
    TableName: "hc-attendees",
    ProjectionExpression: "email",
  });
  return result.Items.map((x) => x.email);
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
  return result.Items.map((x) => x.email);
}

const ignoreList = new Set();

async function main({ token }) {
  const optOuts = await getOptOuts();
  for (const email of optOuts) ignoreList.add(email);
  const attendees = await getAttendees();
  //const paidRegistrations = await getPaidRegistrations();
  const registrations = new Set(attendees.filter((x) => !ignoreList.has(x)));

  //console.log(token);

  //console.log(registrations);
  console.log(registrations.size);
  //return;
  for (const email of registrations) {
    await sendEmailWithTemplate({
      token,
      templateId: Template.Feedback,
      from: "Hacker Camp Crew <team@hackercamp.cz>",
      to: email,
      data: {},
    });
    console.log(email, "sent");
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config send-hackers-mails.js
