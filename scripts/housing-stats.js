import { difference } from "https://deno.land/std/datetime/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";

const dynamo = createClient();

async function getAttendees(year) {
  const result = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: "slackID, checkIn, checkout",
    FilterExpression: "#year = :year AND attribute_exists(checkIn)",
    ExpressionAttributeValues: { ":year": year },
    ExpressionAttributeNames: { "#year": "year" }
  });
  return result.Items;
}

async function updateAttendee(year, slackID, days) {
  await dynamo.updateItem({
    TableName: "attendees",
    Key: { year, slackID },
    UpdateExpression: "SET days = :days",
    ExpressionAttributeValues: { ":days": days }
  });
}

async function main({ year }) {
  year = Number.parseInt(year);
  const attendees = await getAttendees(year);
  for (const attendee of attendees) {
    const checkIn = attendee.checkIn.substring(0, 10);
    const checkOut = (attendee.checkout ?? `${year}-08-31T08:18:58.427Z`).substring(0, 10);
    const diff = difference(new Date(checkIn), new Date(checkOut), { units: ["days"] });
    await updateAttendee(year, attendee.slackID, diff.days);
  }
}

await main(parseArgs(Deno.args, { year: new Date().getFullYear() }));

// AWS_PROFILE=hackercamp deno run --allow-import --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config housing-stats.js
