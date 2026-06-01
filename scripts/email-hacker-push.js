import {createClient} from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import {partition} from "https://esm.sh/@thi.ng/transducers";
import {parseArgs} from "jsr:@std/cli/parse-args";
import {sendEmailsWithTemplate, Template} from "./lib/postmark.js";

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
    ExpressionAttributeNames: {"#year": "year"},
    ExpressionAttributeValues: {":year": year}
  });
  return new Set(result.Items.map(x => x.email));
}

async function getRegistrations(year) {
  const result = await dynamo.scan({
    TableName: "registrations",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year",
    ExpressionAttributeNames: {"#year": "year"},
    ExpressionAttributeValues: {":year": year}
  });
  return new Set(result.Items.map(x => x.email));
}

async function spit(emails) {
  const encoder = new TextEncoder();
  const data = encoder.encode(Array.from(emails).join("\n") + "\n");
  await Deno.writeFile("data/contacts.txt", data);
}

async function main({token, year, ["dry-run"]: dryRun}) {
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

await main(parseArgs(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-import --allow-read=$HOME/.aws/credentials,$HOME/.aws/config --allow-net=api.postmarkapp.com,dynamodb.eu-central-1.amazonaws.com email-hacker-push.js --token=$(op read "op://HackerCamp/Postmark/credential") --year=2025
