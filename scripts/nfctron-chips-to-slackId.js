import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { collect } from "./lib/dynamodb.js";

const dynamo = createClient();

async function getAttendees() {
  const result = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: "slackID, nfcTronData",
    FilterExpression: "attribute_exists(nfcTronData)"
  });
  return collect(result);
}

async function main() {
  const attendees = await getAttendees();
  const data = attendees.flatMap(a => a.nfcTronData.filter(x => x.sn).map(x => [x.sn, a.slackID]));
  console.log(
    JSON.stringify(
      Object.entries(Object.groupBy(data, x => x[0])).map(x => [x[0], Array.from(new Set(x[1].map(y => y[1])))])
    )
  );
}

await main(parseArgs(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-import --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config nfctron-chips-to-slackId.js
