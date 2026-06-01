import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { parseArgs } from "jsr:@std/cli/parse-args";

const dynamo = createClient();

/**
 * Gets contact by slackID. Fetches all attributes, so we can recreate the contact without data loss.
 * @param {String} slackID
 * @returns {Promise<Object>}
 */
async function getContact(slackID) {
  const result = await dynamo.scan({
    TableName: "contacts",
    FilterExpression: "slackID = :slackID",
    ExpressionAttributeValues: { ":slackID": slackID },
    Select: "ALL_ATTRIBUTES"
  });
  return result.Items[0];
}

/**
 * Deletes contact.
 * @param {{email: String, slackID: String}} contact Has to have all attributes, otherwise there is possible data loss
 * @returns {Promise<void>}
 */
async function deleteContact(contact) {
  await dynamo.deleteItem({ TableName: "contacts", Key: { slackID: contact.slackID, email: contact.email } });
}

/**
 * Result can be async iterator or just array. This collects all the result to the array
 * @param result
 * @returns {Promise<Object[]>}
 */
async function collect(result) {
  if (result.Items) return result.Items;
  const items = [];
  for await (const page of result) {
    items.push(...page.Items);
  }
  return items;
}

/**
 * Get all tickets of the user
 * @param {String} slackID
 * @returns {Promise<Object[]>}
 */
async function getAttendees(slackID) {
  const result = await dynamo.scan({
    TableName: "attendees",
    FilterExpression: "slackID = :slackID",
    ExpressionAttributeValues: { ":slackID": slackID },
    Select: "ALL_ATTRIBUTES"
  });
  return collect(result);
}

/**
 * Sets new e-mail to the attendee
 * @param {Object} attendee
 * @param {String} email
 * @param {String} slackID
 * @returns {Promise<void>}
 */
async function updateAttendee(attendee, email, slackID) {
  await dynamo.updateItem({
    TableName: "attendees",
    Key: { slackID: attendee.slackID, year: attendee.year },
    UpdateExpression: "SET email = :email, slackID = :slackID",
    ExpressionAttributeValues: { ":email": email, "slackID": slackID }
  });
}

/**
 * Gets all user registrations. fetches all attributes, so we can recreate the registration without data loss.
 * @param {String} email
 * @returns {Promise<Object[]>}
 */
async function getRegistrations(email) {
  const result = await dynamo.scan({
    TableName: "registrations",
    FilterExpression: "#email = :email",
    ExpressionAttributeValues: { ":email": email },
    ExpressionAttributeNames: { "#email": "email" },
    Select: "ALL_ATTRIBUTES"
  });
  return collect(result);
}

async function updateRegistration(registration, email) {
  await dynamo.deleteItem({ TableName: "registrations", Key: { year: registration.year, email: registration.email } });
  await dynamo.putItem({ TableName: "registrations", Item: Object.assign({}, registration, { email }) });
}

async function main({ fromSlackID, toSlackID, fromEmail, toEmail }) {
  const [fromContact, toContact] = await Promise.all([getContact(fromSlackID), getContact(toSlackID)]);

  console.log({ fromContact, toContact });

  const attendees = await getAttendees(fromSlackID);
  console.log({ attendees });
  for (const attendee of attendees) {
    await updateAttendee(attendee, toEmail, toSlackID);
  }

  const registrations = await getRegistrations(fromEmail);
  console.log({ registrations: registrations.map(({ year, email }) => ({ email, year })) });
  for (const registration of registrations) {
    await updateRegistration(registration, toEmail);
  }

  await deleteContact(fromContact);
  console.log("OK");
}

await main(parseArgs(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-import --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config merge-hacker-accounts.js --fromSlackID=hc-test --fromEmail=old@example.com --toSlackID=hc-test-2 --toEmail=newEmail
