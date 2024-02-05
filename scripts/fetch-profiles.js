import { parse } from "https://deno.land/std@0.140.0/flags/mod.ts";
import { writeCSVObjects } from "https://deno.land/x/csv@v0.7.5/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";

const dynamo = createClient();

async function main({ token }) {
  const skip = new Set(["slackbot", "jakub"]);
  const resp = await fetch("https://slack.com/api/users.list", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  const users = data.members.filter(
    (x) => !(x.is_bot || x.deleted || skip.has(x.name))
  );
  const items = users.map((x) => ({
    email: x.profile.email,
    slackID: x.id,
    slug: x.name,
    name: x.profile.real_name,
    image: x.profile.image_512,
  }));

  for (const contact of items) {
    await dynamo.putItem({ TableName: "hc-contacts", Item: contact });
  }

  return;
  const header = Object.keys(items[0]);
  const f = await Deno.open("./data/contacts.csv", {
    write: true,
    create: true,
    truncate: true,
  });
  try {
    await writeCSVObjects(f, items, { header });
  } finally {
    f.close();
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config fetch-profiles.js --token $(op read 'op://Hacker Camp/Slack Bot/credential')
