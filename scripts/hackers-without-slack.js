import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";

const dynamo = createClient();

async function* getAttendees(year) {
  const result = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: "slackID, #y, email, invoice_id, ticketType, paid",
    FilterExpression: "#y = :y",
    ExpressionAttributeNames: { "#y": "year" },
    ExpressionAttributeValues: { ":y": year }
  });
  if (result.hasOwnProperty(Symbol.asyncIterator)) {
    for await (const page of result) {
      yield page.Items;
    }
  } else {
    yield result.Items;
  }
}

async function getAllAttendees() {
  const result = [];
  for await (const page of getAttendees(2025)) {
    result.push(...page);
  }
  return result;
}

async function* getRegistrations(year) {
  const result = await dynamo.scan({
    TableName: "registrations",
    ProjectionExpression: "email, #y, invoice_id, paid, invoiced, #ts",
    FilterExpression: "#y = :y",
    ExpressionAttributeNames: { "#y": "year", "#ts": "timestamp" },
    ExpressionAttributeValues: { ":y": year }
  });
  if (result.hasOwnProperty(Symbol.asyncIterator)) {
    for await (const page of result) {
      yield page.Items;
    }
  } else {
    yield result.Items;
  }
}
async function getAllRegistrations() {
  const result = [];
  for await (const page of getRegistrations(2025)) {
    result.push(...page);
  }
  return result;
}

async function main({}) {
  const regs = await getAllRegistrations();
  const attendees = await getAllAttendees();
  const ok = new Set(attendees.map(x => x.email));
  const notRegistered = regs.filter(x => x.paid && !ok.has(x.email)).map(x => x.email);
  console.log(notRegistered);
  console.log(notRegistered.length);
}

await main(parseArgs(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-import --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config hackers-without-slack.js
