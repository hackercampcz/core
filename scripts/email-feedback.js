import { parse } from "https://deno.land/std/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { partition } from "https://esm.sh/@thi.ng/transducers";
import { Attachments, sendEmailsWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

/**
 * The result may be async iterator or just an array. This function collects all the results in the array.
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
    FilterExpression: "#year = :year",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: { ":year": year }
  });
  const items = await collect(result);
  return new Set(items.map((x) => x.email));
}

async function main({ token }) {
  const year = 2024;
  const attendees = await getAttendees(year);
  const skip = new Set(["adam@influencer.cz", "michaela.mcclelland@javorina.com", "adam@lepsinapad.cz"]);
  console.log(`Found ${attendees.size} attendees`);
  const emails = attendees.difference(skip);
  console.log(`Found ${emails.size} emails`);
  for (const batch of partition(500, true, emails)) {
    const resp = await sendEmailsWithTemplate({
      token,
      emails: batch,
      templateId: Template.FeedbackResults,
      tag: "feedback",
      attachments: [Attachments.Event2025]
    });
    for (const item of resp) {
      if (item.ErrorCode) console.error(item);
      else console.log(`✅ ${item.To}`);
    }
  }
  console.log("DONE");
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-import --allow-env --allow-read=$HOME/.aws/credentials,$HOME/.aws/config --allow-net=api.postmarkapp.com,dynamodb.eu-central-1.amazonaws.com email-feedback.js --token=$(op read "op://HackerCamp/Postmark/credential")
