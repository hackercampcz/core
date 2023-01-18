import { parse } from "https://deno.land/std@0.140.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb@master/mod.ts";
import { sendEmailWithTemplate, Template } from "./postmark.js";

async function inviteSlackUser(email, token) {
  const resp = await fetch("https://slack.com/api/admin.users.invite", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email,
      team_id: "T01V4Q0ACQ4",
      channel_ids:
        "C01V4Q0AZ0U,C01URRQ2CR4,C01URRT4Z8W,C026KB0G8V8,C026CD74YJ2,C0278R69JUQ,C026G4WA64D,C026XQ8AKU1",
    }),
  });
  if (!resp.ok) {
    console.error(await resp.json());
  }
  console.log(await resp.json());
}

async function sendSlackInvitation(invites, postmarkToken) {
  for (const email of invites) {
    await sendEmailWithTemplate({
      token: postmarkToken,
      from: "Hacker Camp Crew <team@hackercamp.cz>",
      to: email,
      templateId: Template.SlackInvite,
      data: {},
    });
    console.log(`${email} sent`);
  }
}

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
  const imagesByEmail = new Map(
    users.map((x) => [x.profile.email, x.profile.image_512])
  );
  const slugByEmail = new Map(users.map((x) => [x.profile.email, x.name]));
  return { idsByEmail, imagesByEmail, slugByEmail };
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
    FilterExpression:
      "attribute_exists(invoiced) and attribute_not_exists(cancelled)",
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
    console.log(attendee.email);
    try {
      const result = await createAttendee(dynamo, attendee);
      console.log(result);
    } catch (e) {
      console.error(e.message);
      console.log(attendee);
    }
  }
}

async function getAttendees(dynamo, year) {
  const result = await dynamo.scan({
    TableName: "hc-attendees",
    FilterExpression: "#y = :year",
    ExpressionAttributeNames: { "#y": "year" },
    ExpressionAttributeValues: { ":year": year },
    ProjectionExpression: "email",
  });
  return new Set(result.Items.map((x) => x.email));
}

async function getOptOuts(dynamo, year = 2022) {
  const result = await dynamo.scan({
    TableName: "hc-optouts",
    ProjectionExpression: "email",
    FilterExpression: "#y = :year",
    ExpressionAttributeNames: {
      "#y": "year",
    },
    ExpressionAttributeValues: {
      ":year": year,
    },
  });
  return result.Items.map((x) => x.email);
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

async function main({ slackToken, postmarkToken }) {
  const dynamo = createClient();
  const { idsByEmail, imagesByEmail, slugByEmail } =
    await getExistingSlackAccounts(slackToken);
  const ignoreList = new Set([]);
  const optOuts = await getOptOuts(dynamo);
  for (const email of optOuts) ignoreList.add(email);
  const paidRegistrations = await getPaidRegistrations(dynamo);
  const registrations = paidRegistrations.filter(
    (x) => !ignoreList.has(x.email)
  );
  const keys = new Set([
    "housing",
    "stayTimeCustom",
    "email",
    "invoice_id",
    "invoiced",
    "paid",
    "company",
    "ticketType",
    "patronAllowance",
    "travel",
    "year",
  ]);
  const existingAttendees = await getAttendees(dynamo, 2022);
  const attendees = registrations
    .filter((x) => !existingAttendees.has(x.email))
    .map((x) => {
      const id = `hc-${crypto.randomUUID()}`;
      return Object.assign({}, selectKeys(x, keys), {
        slackID: idsByEmail.get(x.email) ?? id,
        slug: slugByEmail.get(x.email) ?? id,
        company: x.company?.trim() ?? undefined,
        name: `${x.firstName} ${x.lastName}`,
        image: imagesByEmail.get(x.email),
      });
    })
    .map((x) => Object.fromEntries(Object.entries(x).filter(([, v]) => v)));
  //const slackInvites = attendees.filter((x) => !x.slackID).map((x) => x.email);
  //await sendSlackInvitation(slackInvites, postmarkToken);
  //console.log(JSON.stringify(attendees, null, 2));
  console.log(attendees.length);
  await createAttendees(attendees, dynamo);
}

await main(parse(Deno.args));
