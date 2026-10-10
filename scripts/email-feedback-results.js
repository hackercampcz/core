import { parseArgs } from "@std/cli/parse-args";
import { partition } from "@thi.ng/transducers";
import { collect, createClient } from "./lib/dynamodb.js";
import { Attachments, sendEmailsWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

async function getAttendees(year) {
  const result = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: { ":year": year }
  });
  const items = await collect(result);
  return new Set(items.map(x => x.email));
}

async function main({ token, year }) {
  const attendees = await getAttendees(Number.parseInt(year));
  const skip = new Set(["auris.kepkova@gmail.com"]);
  console.log(`Found ${attendees.size} attendees`);
  const emails = attendees.difference(skip);
  console.log(`Found ${emails.size} emails`);
  for (const batch of partition(500, true, emails)) {
    const resp = await sendEmailsWithTemplate({
      token,
      emails: batch,
      templateId: Template.FeedbackResults,
      tag: "feedback-results",
      attachments: [Attachments.Event2026]
    });
    for (const item of resp) {
      if (item.ErrorCode) console.error(item);
      else console.log(`✅ ${item.To}`);
    }
  }
  console.log("DONE");
}

await main(parseArgs(process.argv.slice(2)));

// AWS_PROFILE=hackercamp node --permission --allow-net --allow-fs-read=../ --allow-fs-read=$HOME/.aws/credentials --allow-fs-read=$HOME/.aws/config email-feedback-results.js --token=$(op read "op://HackerCamp/Postmark/credential") --year=2025
