import { parse } from "https://deno.land/std/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";

const dynamo = createClient();

async function main({}) {
  const text = await Deno.readTextFile("./data/import-contacts.json");
  const data = JSON.parse(text);

  for (const contact of data) {
    await dynamo.putItem({ TableName: "contacts", Item: contact });
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=./data/import-contacts.json,$HOME/.aws/credentials,$HOME/.aws/config import-contacts.js
