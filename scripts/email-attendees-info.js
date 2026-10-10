import { parseArgs } from "@std/cli/parse-args";
import { partition } from "@thi.ng/transducers";
import { collect, createClient } from "./lib/dynamodb.js";
import { sendEmailsWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

async function getAttendees(year) {
  const result = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year AND ticketType <> :volunteer",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: {
      ":year": year,
      ":volunteer": "volunteer"
    }
  });
  const items = await collect(result);
  return new Set(items.map(x => x.email));
}

async function getRegistrations(year) {
  const result = await dynamo.scan({
    TableName: "registrations",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year AND ticketType <> :volunteer",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: {
      ":year": year,
      ":volunteer": "volunteer"
    }
  });
  const items = await collect(result);
  return new Set(items.map(x => x.email));
}

async function main({ token, year }) {
  year = Number.parseInt(year);
  const attendees = await getAttendees(year);
  const registrations = await getRegistrations(year);
  console.log(`Found ${attendees.size} attendees and ${registrations.size} registrations`);
  const emails = attendees.union(registrations);
  for (const batch of partition(500, true, emails)) {
    const resp = await sendEmailsWithTemplate({
      token,
      emails: batch,
      templateId: Template.AttendeesInfoMail,
      tag: "attendees-info"
    });
    for (const item of resp) {
      if (item.ErrorCode) console.error(item);
      else console.log(`✅ ${item.To}`);
    }
  }
  console.log("DONE");
}

await main(parseArgs(process.argv.slice(2)));

// AWS_PROFILE=hackercamp node --permission --allow-net --allow-fs-read=../ --allow-fs-read=$HOME/.aws/credentials --allow-fs-read=$HOME/.aws/config email-attendees-info.js --token=$(op read "op://HackerCamp/Postmark/credential") --year=2025
