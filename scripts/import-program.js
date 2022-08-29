import { parse } from "https://deno.land/std@0.140.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";

const dynamo = createClient();

async function main({}) {
  const text = await Deno.readTextFile("./data/import-program.json");
  const now = new Date().toISOString();
  const data = JSON.parse(text).map((x) =>
    Object.assign(x, {
      year: 2022,
      _id: crypto.randomUUID(),
      approved: now,
      approvedBy: "U0202S9SB1T",
    })
  );

  for (const event of data) {
    await dynamo.putItem({ TableName: "hc-program", Item: event });
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-net --allow-read=./data/import-program.json,$HOME/.aws/credentials,$HOME/.aws/config import-program.js
