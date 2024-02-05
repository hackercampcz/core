import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { difference } from "https://deno.land/std@0.201.0/datetime/mod.ts";

const dynamo = createClient();

async function getAttendees() {
  const result = await dynamo.scan({
    TableName: "hc-attendees",
    ProjectionExpression: "slackID, checkIn, checkout",
    FilterExpression: "#year = :year AND attribute_exists(checkIn)",
    ExpressionAttributeValues: { ":year": 2023 },
    ExpressionAttributeNames: { "#year": "year" },
  });
  return result.Items;
}

async function updateAttendee(year, slackID, days) {
  await dynamo.updateItem({
    TableName: "hc-attendees",
    Key: { year, slackID },
    UpdateExpression: "SET days = :days",
    ExpressionAttributeValues: { ":days": days },
  });
}

async function main({}) {
  const attendees = await getAttendees();
  for (const attendee of attendees) {
    const checkIn = attendee.checkIn.substring(0, 10);
    const checkOut = (
      attendee.checkout ?? "2023-09-03T08:18:58.427Z"
    ).substring(0, 10);
    const diff = difference(new Date(checkIn), new Date(checkOut), {
      units: ["days"],
    });
    await updateAttendee(2023, attendee.slackID, diff.days);
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config housing-stats.js
