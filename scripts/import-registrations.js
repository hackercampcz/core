import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";

const dynamo = createClient();

function getTimestamp(x) {
  let [date, time] = x.timestamp.split(" ");
  let [day, month, year] = date.split(".");
  if (month.length === 1) month = "0" + month;
  if (day.length === 1) day = "0" + day;
  if (time.length === 7) time = "0" + time;
  const timestamp = `${year}-${month}-${day}T${time}`;
  console.log(timestamp);
  return new Date(timestamp).toISOString();
}

async function main({}) {
  const text = await Deno.readTextFile("./data/import-registrations.json");
  const data = JSON.parse(text).map((x) => Object.assign(x, { timestamp: getTimestamp(x) }));

  for (const registration of data) {
    await dynamo.putItem({ TableName: "registrations", Item: registration });
    process.stdout.write(".");
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=./data/import-registrations.json,$HOME/.aws/credentials,$HOME/.aws/config import-registrations.js
