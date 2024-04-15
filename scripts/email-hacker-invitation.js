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

async function main({ token }) {
  const emails = await getAllContactsEmails();
  console.log(`Found ${emails.length} contacts`);
  for (const batch of partition(500, true, emails)) {
    const resp = await sendEmailsWithTemplate({
      token,
      emails: batch,
      templateId: Template.HackerInvitation,
      tag: "hacker-invitation",
    });
    for (const item of resp) {
      if (item.ErrorCode) console.error(item);
      else console.log(`✅ ${item.To}`);
    }
  }
  console.log("DONE");
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-read=$HOME/.aws/credentials,$HOME/.aws/config --allow-net=api.postmarkapp.com,dynamodb.eu-central-1.amazonaws.com email-hacker-invitation.js --token=$(op read "op://HackerCamp/Postmark/credential")
