import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { sendEmailWithTemplate, Template } from "./lib/postmark.js";

const dynamo = createClient();

async function getContacts() {
  console.log("Loading contacts…");
  const resp = await dynamo.scan({
    TableName: "hc-contacts",
    AttributesToGet: ["email"],
  });
  const contacts = resp.Items.map((x) => x.email);
  console.log(`Loaded ${contacts.length} contacts`);
  return contacts;
}

const hardBounce = new Set([
  "lucie.paurova@rouvy.com",
  "matej@impulseventures.com",
  "sam@apify.com",
  "tomas.hujer@topmonks.com",
  "matyas.lustig@shipmonk.com",
  "anna.prochazkova@apify.com",
  "samuel.kozuch@keboola.com",
  "suchora.jiri@feg.eu",
  "tomas.kapler@revolt.bi",
  "holdy@topmonks.com",
  "jan.fiedler@topmonks.com",
  "matous@nation1.vc",
  "jonas.petrovsky@kiwi.com",
  "andrej.hanes@kiwi.com",
  "daniel@deepnote.com",
]);

async function getRegistrations() {
  console.log("Loading registrations…");
  const resp = await dynamo.scan({
    TableName: "hc-registrations",
    FilterExpression:
      "#year = :year AND NOT ticketType IN (:volunteer, :staff)",
    ProjectionExpression: "email",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: {
      ":year": 2023,
      ":volunteer": "volunteer",
      ":staff": "staff",
    },
  });
  const registrations = resp.Items.map((x) => x.email);
  console.log(`Loaded ${registrations.size} registrations`);
  return registrations;
}
async function getOptOuts() {
  console.log("Loading optouts…");
  const resp = await dynamo.scan({
    TableName: "hc-optouts",
    FilterExpression: "#year = :year",
    ProjectionExpression: "email",
    ExpressionAttributeNames: { "#year": "year" },
    ExpressionAttributeValues: { ":year": 2023 },
  });
  const outOuts = new Set(resp.Items.map((x) => x.email));
  console.log(`Loaded ${outOuts.size} optouts`);
  return outOuts;
}

async function main({ token }) {
  const registrations = await getRegistrations();
  const optOuts = await getOptOuts();
  const notRegistered = registrations
    .filter((x) => !hardBounce.has(x))
    .filter((x) => !optOuts.has(x));
  console.log(`Sending ${notRegistered.length} emails`);
  for (const email of notRegistered) {
    console.log(`"${email}",`);
    await sendEmailWithTemplate({
      token,
      templateId: 32930985,
      from: "Hacker Camp Crew <team@hackercamp.cz>",
      to: email,
      data: {},
    });
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config send-hackers-final-info-mails.js --token $(op read 'op://Hacker Camp/Postmark/credential')
