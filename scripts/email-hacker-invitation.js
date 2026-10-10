import { parseArgs } from "@std/cli/parse-args";
import { partition } from "@thi.ng/transducers";
import { writeFile } from "node:fs/promises";
import { createClient } from "./lib/dynamodb.js";
import { sendEmailsWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

const skip = new Set([
]);

async function getAllContactsEmails() {
  const result = await dynamo.scan({ TableName: "contacts", ProjectionExpression: "email" });
  return result.Items.map(x => x.email).filter(email => !skip.has(email));
}

async function spit(emails) {
  const encoder = new TextEncoder();
  const data = encoder.encode(emails.join("\n") + "\n");
  await Deno.writeFile("data/contacts.txt", data);
}

const correctedBounces = [
];

async function main({ token, ["dry-run"]: dryRun }) {
  const emails = correctedBounces; // await getAllContactsEmails(); //
  console.log(`Found ${emails.length} contacts`);
  if (dryRun) {
    await spit(emails);
    console.log("cat ./data/contacts.txt");
    return;
  }
  for (const batch of partition(500, true, emails)) {
    const resp = await sendEmailsWithTemplate({
      token,
      emails: batch,
      templateId: Template.HackerInvitation,
      tag: "hacker-invitation"
    });
    for (const item of resp) {
      if (item.ErrorCode) console.error(item);
      else console.log(`✅ ${item.To}`);
    }
  }
  console.log("DONE");
}

await main(parseArgs(process.argv.slice(2)));

// AWS_PROFILE=hackercamp node --permission --allow-net --allow-fs-read=../ --allow-fs-read=$HOME/.aws/credentials --allow-fs-read=$HOME/.aws/config --allow-fs-write=./data email-hacker-invitation.js --token=$(op read "op://HackerCamp/Postmark/credential")
