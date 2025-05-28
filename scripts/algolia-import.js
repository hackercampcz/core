import { parseArgs } from "jsr:@std/cli/parse-args";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb@master/mod.ts";
import { algoliasearch } from "npm:algoliasearch";
import { createFetchRequester } from "npm:@algolia/requester-fetch";
import { getAttendeesProjection, getRegistrationProjection } from "../lib/search.js";

const dynamo = createClient();
const indexes = new Map([
  ["hc-registrations", {
    indexName: "hc-registrations",
    indexSettings: {
      searchableAttributes: ["name", "email", "company", "invoice_id"],
      ranking: ["desc(createdAt)", "typo", "words", "filters", "proximity", "attribute", "exact", "custom"]
    }
  }],
  ["hc-attendees", {
    indexName: "hc-attendees",
    indexSettings: {
      searchableAttributes: ["name", "email", "company", "invoice_id"],
      ranking: ["desc(createdAt)", "typo", "words", "filters", "proximity", "attribute", "exact", "custom"]
    }
  }]
]);

async function getOptOuts() {
  const resp = await dynamo.scan({
    TableName: "optouts",
    ProjectionExpression: "#yr, email",
    ExpressionAttributeNames: { "#yr": "year" }
  });
  return new Set(resp.Items.map(({ year, email }) => `${year}-${email}`));
}

async function getRegistrations() {
  const optOuts = await getOptOuts();
  const resp = await dynamo.scan({
    TableName: "registrations",
    ProjectionExpression: [
      "#year",
      "email",
      "company",
      "firstName",
      "lastName",
      "#timestamp",
      "invoiced",
      "invoice_id",
      "paid",
      "firstTime",
      "referral",
      "ticketType",
      "approved",
      "image"
    ].join(),
    ExpressionAttributeNames: { "#year": "year", "#timestamp": "timestamp" }
  });

  if (resp.Items) {
    return resp.Items.filter(x => !optOuts.has(`${x.year}-${x.email}`));
  }

  const result = [];
  for await (const { Items } of resp) {
    result.push(...Items.filter(x => !optOuts.has(`${x.year}-${x.email}`)));
  }
  return result;
}

async function getAttendees() {
  const resp = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: [
      "#year",
      "slackID",
      "email",
      "company",
      "#name",
      "paid",
      "invoiced",
      "invoice_id",
      "ticketType",
      "travel",
      "housing",
      "image"
    ].join(),
    ExpressionAttributeNames: { "#year": "year", "#name": "name" }
  });

  if (resp.Items) {
    return resp.Items;
  }

  const result = [];
  for await (const { Items } of resp) {
    result.push(...Items);
  }
  return result;
}

async function indexRegistrations(client) {
  await client.setSettings(indexes.get("hc-registrations"));

  const registrations = await getRegistrations();
  const records = registrations.map(getRegistrationProjection());
  console.log(`Importing ${records.length} registrations to Algolia`);
  return client.saveObjects({
    indexName: "hc-registrations",
    objects: records
  });
}

async function indexAttendees(client) {
  await client.setSettings(indexes.get("hc-attendees"));

  const attendees = await getAttendees();
  const records = attendees.map(getAttendeesProjection());
  console.log(`Importing ${records.length} attendees to Algolia`);
  return client.saveObjects({
    indexName: "hc-attendees",
    objects: records
  });
}

async function main({ adminToken }) {
  const client = algoliasearch("J77BFM3PLE", adminToken, {
    requester: createFetchRequester()
  });

  console.log(await indexRegistrations(client));
  console.log(await indexAttendees(client));
}

await main(
  Object.assign(
    { adminToken: Deno.env.get("ALGOLIA_ADMIN_API_KEY") },
    parseArgs(Deno.args)
  )
);

// op run --env-file=../.env -- deno run --allow-env --allow-import --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config algolia-import.js
