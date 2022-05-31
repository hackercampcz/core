import { parse } from "https://deno.land/std@0.140.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { sendEmailWithTemplate, Template } from "./postmark.js";

const dynamo = createClient();

async function main({ token }) {
  const result = await dynamo.scan({
    TableName: "hc-registrations",
    Select: "ALL_ATTRIBUTES",
  });
  const registrations = result.Items;
  const hackers = registrations.filter((x) => !x.firstTime);
  const waitingList = registrations.filter((x) => x.firstTime);
  console.log({ hackers, waitingList });
  for (const hacker of hackers) {
    await sendEmailWithTemplate({
      token,
      templateId: Template.HackerInvitation,
      from: "Hacker Camp Crew <team@hackercamp.cz>",
      to: hacker.email,
      bcc: "ir@izatlouk.cz",
    });
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config send-hackers-mails.js
