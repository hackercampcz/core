import { parse } from "https://deno.land/std/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";

const dynamo = createClient();

async function getContact(slackID) {
  const result = await dynamo.scan({
    TableName: "contacts",
    FilterExpression: "slackID = :slackID",
    ExpressionAttributeValues: { ":slackID": slackID },
    Select: "ALL_ATTRIBUTES",
  });
  return result.Items[0];
}

async function updateContact(contact, email) {
  await dynamo.deleteItem({
    TableName: "contacts",
    Key: { slackID: contact.slackID, email: contact.email },
  });
  await dynamo.putItem({
    TableName: "contacts",
    Item: Object.assign({}, contact, { email }),
  });
}

async function collect(result) {
  if (result.Items) return result.Items;
  const items = [];
  for await (const page of result) {
    items.push(...page.Items);
  }
  return items;
}

async function getAttendees(slackID) {
  const result = await dynamo.scan({
    TableName: "attendees",
    FilterExpression: "slackID = :slackID",
    ExpressionAttributeValues: { ":slackID": slackID },
    ExpressionAttributeNames: { "#year": "year" },
    ProjectionExpression: "slackID, #year",
  });
  return collect(result);
}

async function updateAttendee(attendee, email) {
  await dynamo.updateItem({
    TableName: "attendees",
    Key: { slackID: attendee.slackID, year: attendee.year },
    UpdateExpression: "SET email = :email",
    ExpressionAttributeValues: { ":email": email },
  });
}

async function getRegistrations(email) {
  const result = await dynamo.scan({
    TableName: "registrations",
    FilterExpression: "#email = :email",
    ExpressionAttributeValues: { ":email": email },
    ExpressionAttributeNames: { "#email": "email" },
    Select: "ALL_ATTRIBUTES",
  });
  return collect(result);
}

async function updateRegistration(registration, email) {
  await dynamo.deleteItem({
    TableName: "registrations",
    Key: { year: registration.year, email: registration.email },
  });
  await dynamo.putItem({
    TableName: "registrations",
    Item: Object.assign({}, registration, { email }),
  });
}

async function updateEmailOfSlackUser(slackToken, slackID, email) {
  const resp = await fetch("https://slack.com/api/users.profile.set", {
    method: "POST",
    headers: { Authorization: `Bearer ${slackToken}` },
    body: new URLSearchParams({ user: slackID, name: "email", value: email }),
  });
  return resp.json();
}

async function main({ slackID, email, slackToken }) {
  const contact = await getContact(slackID);
  console.log({ contact });
  const origEmail = contact.email;
  await updateContact(contact, email);

  const attendees = await getAttendees(slackID);
  console.log({ attendees });
  for (const attendee of attendees) {
    await updateAttendee(attendee, email);
  }

  const registrations = await getRegistrations(origEmail);
  console.log({ registrations: registrations.map(({ year, email }) => ({ email, year })) });
  for (const registration of registrations) {
    await updateRegistration(registration, email);
  }

  const result = await updateEmailOfSlackUser(slackToken, slackID, email);
  console.log(result.ok ? "OK" : "FAIL");
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config change-hacker-email.js --slackToken=$(op read "op://HackerCamp/Slack Admin/credential") --slackID=hc-test --email=new@example.com
