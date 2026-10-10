import { parseArgs } from "@std/cli/parse-args";
import { partition } from "@thi.ng/transducers";
import { createClient } from "./lib/dynamodb.js";
import { sendEmailsWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

async function getAllContactsEmails() {
  console.log("Loading contacts…");
  const result = await dynamo.scan({ TableName: "contacts", ProjectionExpression: "email" });
  const contacts = new Set(result.Items.map(x => x.email));
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
    ExpressionAttributeValues: { ":year": year }
  });
  const registrations = new Set(resp.Items.map(x => x.email));
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
    ExpressionAttributeValues: { ":year": year }
  });
  const outOuts = new Set(resp.Items.map(x => x.email));
  console.log(`Loaded ${outOuts.size} optouts`);
  return outOuts;
}

const skip = new Set([
]);

async function main({ token, year }) {
  const allEmails = await getAllContactsEmails();
  const alreadyRegistered = await getRegistrations(year);
  const optedOut = await getOptOuts(year);
  const emails = allEmails.difference(alreadyRegistered).difference(optedOut).difference(skip);
  console.log(`Found ${emails.size} cold hackers`);
  // return console.log(JSON.stringify(Array.from(emails), null, 2));
  for (const batch of partition(500, true, emails)) {
    const resp = await sendEmailsWithTemplate({
      token,
      emails: batch,
      templateId: Template.ColdHackerPush,
      tag: "cold-hacker-push"
    });
    for (const item of resp) {
      if (item.ErrorCode) console.error(item);
      else console.log(`✅ ${item.To}`);
    }
  }
  console.log("DONE");
}

await main(parseArgs(process.argv.slice(2)));

// AWS_PROFILE=hackercamp node --permission --allow-net --allow-fs-read=../ --allow-fs-read=$HOME/.aws/credentials --allow-fs-read=$HOME/.aws/config email-cold-hacker-push.js --token=$(op read "op://HackerCamp/Postmark/credential") --year=2024
