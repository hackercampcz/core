import { parse } from "https://deno.land/std/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { partition } from "https://esm.sh/@thi.ng/transducers";
import { sendEmailsWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

async function getAllContactsEmails() {
  console.log("Loading contacts…");
  const result = await dynamo.scan({
    TableName: "contacts",
    ProjectionExpression: "email",
  });
  const contacts = new Set(result.Items.map((x) => x.email));
  console.log(`Loaded ${contacts.size} contacts`);
  return contacts;
}

async function getRegistrations(year) {
  console.log("Loading registrations…");
  const resp = await dynamo.scan({
    TableName: "registrations",
    FilterExpression: "#year = :year",
    ProjectionExpression: "email",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: { ":year": year },
  });
  const registrations = new Set(resp.Items.map((x) => x.email));
  console.log(`Loaded ${registrations.size} registrations`);
  return registrations;
}

async function getOptOuts(year) {
  console.log("Loading optouts…");
  const resp = await dynamo.scan({
    TableName: "optouts",
    FilterExpression: "#year = :year",
    ProjectionExpression: "email",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: { ":year": year },
  });
  const outOuts = new Set(resp.Items.map((x) => x.email));
  console.log(`Loaded ${outOuts.size} optouts`);
  return outOuts;
}

async function main({ token, year }) {
  const allEmails = await getAllContactsEmails();
  const alreadyRegistered = await getRegistrations(year);
  const optedOut = await getOptOuts(year);
  const emails = allEmails.difference(alreadyRegistered).difference(optedOut);
  console.log(`Found ${emails.size} cold hackers`);
  for (const batch of partition(500, true, emails)) {
    const resp = await sendEmailsWithTemplate({
      token,
      emails: batch,
      templateId: Template.ColdHackerPush,
      tag: "cold-hacker-push",
    });
    for (const item of resp) {
      if (item.ErrorCode) console.error(item);
      else console.log(`✅ ${item.To}`);
    }
  }
  console.log("DONE");
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-read=$HOME/.aws/credentials,$HOME/.aws/config --allow-net=api.postmarkapp.com,dynamodb.eu-central-1.amazonaws.com email-cold-hacker-push.js --token=$(op read "op://HackerCamp/Postmark/credential") --year=2024
