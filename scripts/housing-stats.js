import { difference } from "https://deno.land/std/datetime/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";

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
    ProjectionExpression: "slackID, checkIn, checkout, nfcTronData",
    FilterExpression: "#year = :year AND attribute_exists(checkIn)",
    ExpressionAttributeValues: { ":year": year },
    ExpressionAttributeNames: { "#year": "year" }
  });
  return collect(result);
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
    const lastTransaction = attendee.nfcTronData?.map(x => x.lastTransaction)?.sort()?.at(-1);
    const checkOut = (attendee.checkout ?? lastTransaction ?? `${year}-08-31T08:18:58.427Z`).substring(0, 10);
    const diff = difference(new Date(checkIn), new Date(checkOut), { units: ["days"] });
    await updateAttendee(year, attendee.slackID, diff.days);
  }
}

await main(parseArgs(Deno.args, { year: new Date().getFullYear() }));

// AWS_PROFILE=hackercamp deno run --allow-import --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config housing-stats.js --year=2025
