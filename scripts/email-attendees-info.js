import { parse } from "https://deno.land/std/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { partition } from "https://esm.sh/@thi.ng/transducers";
import { sendEmailsWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

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

async function getAttendees(year) {
  const result = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year AND ticketType <> :volunteer",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: {
      ":year": year,
      ":volunteer": "volunteer",
    },
  });
  const items = await collect(result);
  return new Set(items.map((x) => x.email));
}

async function getRegistrations(year) {
  const result = await dynamo.scan({
    TableName: "registrations",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year AND ticketType <> :volunteer",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: {
      ":year": year,
      ":volunteer": "volunteer",
    },
  });
  const items = await collect(result);
  return new Set(items.map((x) => x.email));
}

async function main({ token }) {
  const year = 2024;
  const attendees = await getAttendees(year);
  const registrations = await getRegistrations(year);
  console.log(`Found ${attendees.size} attendees and ${registrations.size} registrations`);
  const emails = attendees.union(registrations);
  for (const batch of partition(500, true, emails)) {
    const resp = await sendEmailsWithTemplate({
      token,
      emails: batch,
      templateId: Template.AttendeesInfoMail,
      tag: "attendees-info",
    });
    for (const item of resp) {
      if (item.ErrorCode) console.error(item);
      else console.log(`✅ ${item.To}`);
    }
  }
  console.log("DONE");
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-read=$HOME/.aws/credentials,$HOME/.aws/config --allow-net=api.postmarkapp.com,dynamodb.eu-central-1.amazonaws.com email-attendees-info.js --token=$(op read "op://HackerCamp/Postmark/credential")
