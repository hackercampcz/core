import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb@master/mod.ts";

const dynamo = createClient();

async function main({}) {
  const resp = await dynamo.scan({ TableName: "hc-registrations" });
  console.log(resp.Items);
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config fetch-registrations.js
