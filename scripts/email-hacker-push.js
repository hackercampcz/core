import { parse } from "https://deno.land/std/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { partition } from "https://esm.sh/@thi.ng/transducers";
import { sendEmailsWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

async function getAllContactsEmails() {
  const result = await dynamo.scan({
    TableName: "contacts",
    ProjectionExpression: "email",
  });
  return result.Items.map((x) => x.email);
}

async function getOptOuts(year) {
  const result = await dynamo.scan({
    TableName: "optouts",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: { ":year": year },
  });
  return new Set(result.Items.map((x) => x.email));
}

async function getRegistrations(year) {
  const result = await dynamo.scan({
    TableName: "registrations",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: { ":year": year },
  });
  return new Set(result.Items.map((x) => x.email));
}

async function main({ token }) {
  const year = 2024;
  const contacts = await getAllContactsEmails();
  const registrations = await getRegistrations(year);
  const optOuts = await getOptOuts(year);
  const emails = contacts.filter(x => !registrations.has(x)).filter(x => !optOuts.has(x));
  console.log(`Found ${emails.length} contacts`);
  for (const batch of partition(500, true, emails)) {
    const resp = await sendEmailsWithTemplate({
      token,
      emails: batch,
      templateId: Template.HackerPush,
      tag: "hacker-push",
    });
    for (const item of resp) {
      if (item.ErrorCode) console.error(item);
      else console.log(`✅ ${item.To}`);
    }
  }
  console.log("DONE");
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-read=$HOME/.aws/credentials,$HOME/.aws/config --allow-net=api.postmarkapp.com,dynamodb.eu-central-1.amazonaws.com email-hacker-push.js --token=$(op read "op://HackerCamp/Postmark/credential")
