import { parseArgs } from "@std/cli/parse-args";
import { createClient } from "./lib/dynamodb.js";

const dynamo = createClient();

async function main({ email, token }) {
  const skip = new Set(["slackbot", "jakub"]);
  const resp = await fetch("https://slack.com/api/users.list", { headers: { Authorization: `Bearer ${token}` } });
  const data = await resp.json();
  const users = data.members.filter(x => !(x.is_bot || x.deleted || skip.has(x.name)));
  const items = new Map(
    users.map(x => [x.profile.email, {
      email: x.profile.email,
      slackID: x.id,
      slug: x.name,
      name: x.profile.real_name,
      image: x.profile.image_512
    }])
  );

  const item = items.get(email);
  console.log(item);
  await dynamo.putItem({ TableName: "contacts", Item: item });
}

await main(parseArgs(process.argv.slice(2)));

// AWS_PROFILE=hackercamp node --permission --allow-net --allow-fs-read=../ --allow-fs-read=$HOME/.aws/credentials --allow-fs-read=$HOME/.aws/config create-contact.js --token=$(op read 'op://HackerCamp/Slack Bot/credential') --email=$(pbpaste)
