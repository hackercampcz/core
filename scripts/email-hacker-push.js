import { parseArgs } from "@std/cli/parse-args";
import { partition } from "@thi.ng/transducers";
import { writeFile } from "node:fs/promises";
import { createClient } from "./lib/dynamodb.js";
import { sendEmailsWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

export const skip = new Set([
]);

async function getAllContactsEmails() {
  const result = await dynamo.scan({
    TableName: "contacts",
    ProjectionExpression: "email"
  });
  return new Set(result.Items.map(x => x.email));
}

async function getOptOuts(year) {
  const result = await dynamo.scan({
    TableName: "optouts",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: { ":year": year }
  });
  return new Set(result.Items.map(x => x.email));
}

async function getRegistrations(year) {
  const result = await dynamo.scan({
    TableName: "registrations",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: { ":year": year }
  });
  return new Set(result.Items.map(x => x.email));
}

async function spit(emails) {
  const encoder = new TextEncoder();
  const data = encoder.encode(Array.from(emails).join("\n") + "\n");
  await writeFile("data/contacts.txt", data);
}

async function main({ token, year, ["dry-run"]: dryRun }) {
  year = Number.parseInt(year);
  const contacts = await getAllContactsEmails();
  const registrations = await getRegistrations(year);
  const optOuts = await getOptOuts(year);
  const emails = contacts.difference(registrations.union(optOuts).union(skip));
  console.log(`Found ${emails.size} contacts`);
  if (dryRun) {
    await spit(emails);
    console.log("cat ./data/contacts.txt");
    return;
  }
  for (const batch of partition(500, true, emails)) {
    const resp = await sendEmailsWithTemplate({
      token,
      emails: batch,
      templateId: Template.HackerPush,
      tag: "hacker-push"
    });
    for (const item of resp) {
      if (item.ErrorCode) console.error(item);
      else console.log(`✅ ${item.To}`);
    }
  }
  console.log("DONE");
}

await main(parseArgs(process.argv.slice(2)));

// AWS_PROFILE=hackercamp node --permission --allow-net --allow-fs-read=../ --allow-fs-read=$HOME/.aws/credentials --allow-fs-read=$HOME/.aws/config --allow-fs-write=./data email-hacker-push.js --token=$(op read "op://HackerCamp/Postmark/credential") --year=2025
