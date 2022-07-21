import { parse } from "https://deno.land/std@0.140.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb@master/mod.ts";

async function getExistingSlackAccounts(token) {
  const skip = new Set(["slackbot", "jakub"]);
  const resp = await fetch("https://slack.com/api/users.list", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  const users = data.members.filter(
    (x) => !(x.is_bot || x.deleted || skip.has(x.name))
  );

  const idsByEmail = new Map(
    [
    ].concat(users.map((x) => [x.profile.email, x.id]))
  );
  return idsByEmail;
}

/**
 *
 * @param {DynamoDBClient} dynamo
 * @returns {Promise<*>}
 */
async function getPaidRegistrations(dynamo) {
  const result = await dynamo.scan({
    TableName: "hc-registrations",
    Select: "ALL_ATTRIBUTES",
    FilterExpression: "attribute_exists(paid)",
  });
  return result.Items;
}

/**
 *
 * @param {DynamoDBClient} dynamo
 * @returns {Promise<*>}
 */
async function getAttendees(dynamo) {
  const result = await dynamo.scan({
    TableName: "hc-attendees",
    Select: "ALL_ATTRIBUTES",
  });
  return result.Items;
}

/**
 *
 * @param {DynamoDBClient} dynamo
 * @returns {Promise<*>}
 */
function createAttendee(dynamo, attendee) {
  return dynamo.putItem({
    TableName: "hc-attendees",
    Item: attendee,
  });
}

/**
 * @param {{[p: string]: T}[]} attendees
 * @param {DynamoDBClient} dynamo
 */
async function createAttendees(attendees, dynamo) {
  const currentAttendeesWithSlack = attendees.filter((x) => x.slackID);
  for (const attendee of currentAttendeesWithSlack) {
    await createAttendee(dynamo, attendee);
    console.log(attendee.email);
  }
}

/**
 * @param {{[p: string]: T}} obj
 * @param {Set} keys
 */
function selectKeys(obj, keys) {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => keys.has(key))
  );
}

async function main({ token }) {
  const dynamo = createClient();
  const idsByEmail = await getExistingSlackAccounts(token);
  const paidRegistrations = await getPaidRegistrations(dynamo);
  const keys = new Set([
    "housing",
    "stayTimeCustom",
    "email",
    "invoice_id",
    "invoiced",
    "paid",
    "company",
    "ticketType",
    "travel",
    "year",
  ]);
  const attendees = paidRegistrations.map((x) =>
    Object.assign({}, selectKeys(x, keys), {
      slackID: idsByEmail.get(x.email),
      name: `${x.firstName} ${x.lastName}`,
    })
  );
  const slackInvites = attendees.filter((x) => !x.slackID).map((x) => x.email);
  // await createAttendees(attendees, dynamo);
  console.log(await getAttendees(dynamo));
}

await main(parse(Deno.args));
