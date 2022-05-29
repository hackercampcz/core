import { parse } from "https://deno.land/std@0.140.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";

const dynamo = createClient();

async function main({}) {
  const text = await Deno.readTextFile("./data/import-registrations.json");
  const data = JSON.parse(text);

  for (const registration of data) {
    await dynamo.putItem({ TableName: "hc-registrations", Item: registration });
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-net --allow-read=./data/import-registrations.json,$HOME/.aws/credentials,$HOME/.aws/config import-registrations.js
