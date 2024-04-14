import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { getTotalSpent } from "./lib/nfctron.js";

const dynamo = createClient();

async function getAttendees() {
  const result = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: "email, nfcTronData",
    FilterExpression:
      "#year = :year AND attribute_exists(nfcTronData) AND ticketType IN (:volunteer, :crew, :staff) AND NOT attribute_exists(checkOutPaid)",
    ExpressionAttributeValues: {
      ":year": 2023,
      ":volunteer": "volunteer",
      ":crew": "crew",
      ":staff": "staff",
    },
    ExpressionAttributeNames: { "#year": "year" },
  });
  return result.Items;
}

async function main({}) {
  const result = [];
  const attendees = await getAttendees();
  const data = attendees.flatMap((a) => a.nfcTronData.filter((x) => x.sn).map((x) => [a.email, x.chipID]));
  for (const [email, chipID] of data) {
    const totalSpent = await getTotalSpent(chipID);
    result.push([email, totalSpent]);
  }
  const individuals = new Map();
  for (const [email, totalSpent] of result) {
    if (!individuals.has(email)) individuals.set(email, 0);
    individuals.set(email, individuals.get(email) + totalSpent);
  }
  console.log(
    JSON.stringify(
      Object.fromEntries(Array.from(individuals).sort((a, b) => a[1] - b[1])),
      null,
      2,
    ),
  );
  console.log({
    total: result.map((x) => x[1]).reduce((acc, x) => acc + x, 0),
  });
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config fetch-nfctron-chips.js
