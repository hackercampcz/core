import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { sendEmailWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

async function getAttendees() {
  const result = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: "email",
    FilterExpression: "#year = :year",
    ExpressionAttributeValues: { ":year": 2023 },
    ExpressionAttributeNames: { "#year": "year" },
  });
  return result.Items.map((x) => x.email);
}

const ignoreList = new Set([]);

async function main({ token }) {
  const attendees = await getAttendees();
  console.log(`Sending ${attendees.length} emails`);
  for (const email of attendees.filter((x) => !ignoreList.has(x))) {
    await sendEmailWithTemplate({
      token,
      templateId: Template.Feedback,
      from: "Hacker Camp Crew <team@hackercamp.cz>",
      to: email,
      data: {},
      tag: "feedback",
      messageStream: "broadcast",
      attachments: [
        {
          Name: "hackercamp.ical",
          Content:
            "QkVHSU46VkNBTEVOREFSClBST0RJRDotLy9Hb29nbGUgSW5jLy9Hb29nbGUgQ2FsZW5kYXIgNzAuOTA1NC8vRU4KVkVSU0lPTjoyLjAKQ0FMU0NBTEU6R1JFR09SSUFOCk1FVEhPRDpQVUJMSVNIClgtV1ItQ0FMTkFNRTpIYWNrZXJDYW1wIDIwMjQKWC1XUi1USU1FWk9ORTpFdXJvcGUvUHJhZ3VlCkJFR0lOOlZFVkVOVApEVFNUQVJUOjIwMjQwODI5VDE1MDAwMFoKRFRFTkQ6MjAyNDA5MDFUMTAwMDAwWgpEVFNUQU1QOjIwMjMwOTA0VDExMjIzMloKVUlEOjU2MTRla201M2g3dDRydTNqYWdva244ZmhjQGdvb2dsZS5jb20KQ1JFQVRFRDoyMDIzMDkwNFQxMTIyMTRaCkxBU1QtTU9ESUZJRUQ6MjAyMzA5MDRUMTEyMjE0WgpTRVFVRU5DRTowClNUQVRVUzpDT05GSVJNRUQKU1VNTUFSWTpIYWNrZXJDYW1wClRSQU5TUDpPUEFRVUUKRU5EOlZFVkVOVApFTkQ6VkNBTEVOREFSCg==",
          ContentType: "text/calendar",
        },
      ],
    });
    console.log(`"${email}",`);
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config send-feedback-mails.js --token $(op read 'op://HackerCamp/Postmark/credential')
