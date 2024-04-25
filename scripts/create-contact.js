import { parse } from "https://deno.land/std/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";

const dynamo = createClient();

async function main({ email, token }) {
  const skip = new Set(["slackbot", "jakub"]);
  const resp = await fetch("https://slack.com/api/users.list", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  const users = data.members.filter(
    (x) => !(x.is_bot || x.deleted || skip.has(x.name)),
  );
  const items = new Map(
    users.map((x) => [
      x.profile.email,
      {
        email: x.profile.email,
        slackID: x.id,
        slug: x.name,
        name: x.profile.real_name,
        image: x.profile.image_512,
      },
    ]),
  );

  const item = items.get(email);
  console.log(item);
  await dynamo.putItem({ TableName: "contacts", Item: item });
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config create-contact.js --token=$(op read 'op://HackerCamp/Slack Bot/credential') --email=$(pbpaste)
