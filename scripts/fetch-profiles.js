import { parseArgs } from "@std/cli/parse-args";
import { createClient } from "./lib/dynamodb.js";

const dynamo = createClient();

async function main({ token }) {
  const skip = new Set(["slackbot", "jakub"]);
  const resp = await fetch("https://slack.com/api/users.list", { headers: { Authorization: `Bearer ${token}` } });
  const data = await resp.json();
  const users = data.members.filter(x => !(x.is_bot || x.deleted || skip.has(x.name)));
  const items = users.map(x => ({
    email: x.profile.email,
    slackID: x.id,
    slug: x.name,
    name: x.profile.real_name,
    image: x.profile.image_512
  }));

  for (const contact of items) {
    await dynamo.putItem({ TableName: "contacts", Item: contact });
  }
}

await main(parseArgs(process.argv.slice(2)));

// AWS_PROFILE=hackercamp node --permission --allow-net --allow-fs-read=../ --allow-fs-read=$HOME/.aws/credentials --allow-fs-read=$HOME/.aws/config fetch-profiles.js --token $(op read 'op://HackerCamp/Slack Bot/credential')
