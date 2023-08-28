import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";

const dynamo = createClient();

async function getRegistration(email, year) {
  const resp = await dynamo.getItem({
    TableName: "hc-registrations",
    Key: { email, year },
  });
  const reg = resp.Item;
  return reg;
}

async function main({ year, email }) {
  const reg = await getRegistration(email, year);
  console.log(reg);
  console.log(
    await dynamo.putItem({
      TableName: "hc-trash",
      Item: reg,
    })
  );
  console.log(
    await dynamo.deleteItem({
      TableName: "hc-registrations",
      Key: { email, year },
    })
  );
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-net --allow-read=./data/import-program.json,$HOME/.aws/credentials,$HOME/.aws/config move-registration-to-trash.js --year=2023 --email=$(pbpaste)
