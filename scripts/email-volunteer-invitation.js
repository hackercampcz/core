import { parseArgs } from "@std/cli/parse-args";
import { partition } from "@thi.ng/transducers";
import { writeFile } from "node:fs/promises";
import { collect, createClient } from "./lib/dynamodb.js";
import { sendEmailsWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

const skip = new Set([]);

const include = new Set([]);

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

async function getVolunteers(optOuts, skip, include) {
  const result = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: "email",
    FilterExpression: "ticketType = :volunteer",
    ExpressionAttributeValues: { ":volunteer": "volunteer" }
  });
  const items = await collect(result);
  const remove = skip.union(optOuts);
  return new Set(items.map(x => x.email)).difference(remove).union(include);
}

async function spit(emails) {
  const encoder = new TextEncoder();
  const data = encoder.encode(emails.join("\n") + "\n");
  await writeFile("data/volunteers.txt", data);
}

async function main({ token, ["dry-run"]: dryRun }) {
  const optOuts = await getOptOuts(2026);
  for (const email in optOuts) skip.add(email);
  const emails = await getVolunteers(optOuts, skip, include);
  console.log(`Found ${emails.size} contacts`);
  if (dryRun) return await spit(Array.from(emails));
  for (const batch of partition(500, true, emails)) {
    const resp = await sendEmailsWithTemplate({
      token,
      emails: batch,
      templateId: Template.VolunteerInvitation,
      tag: "volunteer-invitation",
      replyTo: "pavla.verflova@hackercamp.cz"
    });
    for (const item of resp) {
      if (item.ErrorCode) console.error(item);
      else console.log(`✅ ${item.To}`);
    }
  }
  console.log("DONE");
}

await main(parseArgs(process.argv.slice(2)));

// AWS_PROFILE=hackercamp node --permission --allow-net --allow-fs-read=../ --allow-fs-read=$HOME/.aws/credentials --allow-fs-read=$HOME/.aws/config --allow-fs-write=./data email-volunteer-invitation.js --token=$(op read "op://HackerCamp/Postmark/credential")
