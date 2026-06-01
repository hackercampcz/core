import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { partition } from "https://esm.sh/@thi.ng/transducers";
import { parseArgs } from "jsr:@std/cli/parse-args";
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

await main(parseArgs(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-import --allow-read=$HOME/.aws/credentials,$HOME/.aws/config --allow-net=api.postmarkapp.com,dynamodb.eu-central-1.amazonaws.com email-hacker-invitation.js --token=$(op read "op://HackerCamp/Postmark/credential")
