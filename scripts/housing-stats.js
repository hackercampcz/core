import { parseArgs } from "@std/cli/parse-args";
import { collect, createClient } from "./lib/dynamodb.js";

const dynamo = createClient();

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
    const { days } = Temporal.PlainDate.from(checkIn).until(Temporal.PlainDate.from(checkOut));
    await updateAttendee(year, attendee.slackID, days);
  }
}

await main(parseArgs(process.argv.slice(2), { year: new Date().getFullYear() }));

// AWS_PROFILE=hackercamp node --permission --allow-net --allow-fs-read=../ --allow-fs-read=$HOME/.aws/credentials --allow-fs-read=$HOME/.aws/config housing-stats.js --year=2025
