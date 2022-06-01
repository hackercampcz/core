import { parse } from "https://deno.land/std@0.140.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { sendEmailWithTemplate, Template } from "./postmark.js";

const dynamo = createClient();

async function getRegistrations() {
  const result = await dynamo.scan({
    TableName: "hc-registrations",
    Select: "ALL_ATTRIBUTES",
  });
  return result.Items;
}

async function getContacts() {
  const result = await dynamo.scan({
    TableName: "hc-contacts",
    Select: "ALL_ATTRIBUTES",
  });
  return result.Items;
}

async function main({ token }) {
  const registrations = new Set((await getRegistrations()).map((x) => x.email));
  const contacts = await getContacts();
  const invitations = contacts
    .filter((c) => registrations.has(c.email))
    .map((c) => c.email);

  console.log(invitations.length);
  return;
  for (const email of invitations) {
    await sendEmailWithTemplate({
      token,
      templateId: Template.HackerInvitationLate,
      from: "Hacker Camp Crew <team@hackercamp.cz>",
      to: email,
      data: {},
    });
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config send-hackers-mails.js
