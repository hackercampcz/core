import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { partition } from "https://esm.sh/@thi.ng/transducers";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { sendEmailsWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

const skip = new Set([
]);

const include = new Set([
]);

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

/**
 * Result can be async iterator or just array. This collects all the results to the array
 * @param result
 * @returns {Promise<Object[]>}
 */
async function collect(result) {
  if (result.Items) return result.Items;
  const items = [];
  for await (const page of result) {
    items.push(...page.Items);
  }
  return items;
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
  await Deno.writeFile("data/volunteers.txt", data);
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

await main(parseArgs(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-read=$HOME/.aws/credentials,$HOME/.aws/config --allow-write=./data --allow-import --allow-net=api.postmarkapp.com,dynamodb.eu-central-1.amazonaws.com email-volunteer-invitation.js --token=$(op read "op://HackerCamp/Postmark/credential")
