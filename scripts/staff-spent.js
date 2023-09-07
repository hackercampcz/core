import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";

const dynamo = createClient();

async function getAttendees() {
  const result = await dynamo.scan({
    TableName: "hc-attendees",
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

async function getTotalSpent(chipID) {
  const resp = await retry(() =>
    fetch(`https://api.nfctron.com/receipt/v2/${chipID}/transaction`)
  );
  if (!resp) return 0;
  const data = await resp.json();
  return (data.totalSpent ?? 0) / 100;
}

async function sleep(number) {
  return new Promise((resolve, reject) => setTimeout(resolve, number));
}

async function retry(callback, retryCount = 3) {
  var lastResult = null;
  for (let i = 0; i < retryCount; i++) {
    const result = await callback();
    lastResult = result;
    if (result.ok) return result;
    else if (result.status === 404) return null;
    else await sleep(2 ** (i + 1) * 10000);
  }
  console.log(await lastResult.json());
  throw new Error();
}

async function main({}) {
  const result = [];
  const attendees = await getAttendees();
  const data = attendees.flatMap((a) =>
    a.nfcTronData.filter((x) => x.sn).map((x) => [a.email, x.chipID])
  );
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
      2
    )
  );
  console.log({
    total: result.map((x) => x[1]).reduce((acc, x) => acc + x, 0),
  });
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config staff-spent.js
