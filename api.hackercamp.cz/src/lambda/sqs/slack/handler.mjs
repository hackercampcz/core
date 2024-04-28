import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { attributes, mapper } from "@hackercamp/lib/attendee.mjs";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import Rollbar from "../../rollbar.mjs";
import { postChatMessage, sendMessageToSlack } from "../../slack.mjs";

/** @typedef {import("aws-lambda").SQSEvent} SQSEvent */

const db = new DynamoDBClient({});
const rollbar = Rollbar.init({ lambdaName: "sqs-slack" });

async function getAttendee(slackID, year) {
  console.log({ event: "Get attendee", year, slackID });
  const resp = await db.send(
    new GetItemCommand({
      TableName: "attendees",
      Key: {
        slackID: { S: slackID },
        year: { N: year.toString() },
      },
    }),
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

function createContact({ id, profile, name }) {
  console.log({ event: "Create contact", slackID: id });
  return db.send(
    new PutItemCommand({
      TableName: "contacts",
      Item: marshall(
        {
          email: profile.email,
          slackID: id,
          slug: name,
          name: profile.real_name,
          image: profile.image_512,
        },
        { removeUndefinedValues: true, convertEmptyValues: true },
      ),
    }),
  );
}

async function createAttendee({ id, profile, name }, record) {
  console.log({ event: "Create attendee", slackID: id });
  return db.send(
    new PutItemCommand({
      TableName: "attendees",
      Item: marshall(
        Object.assign(
          {},
          {
            email: profile.email,
            slackID: id,
            slug: name,
            name: profile.real_name,
            image: profile.image_512,
          },
          selectKeys(record, attributes, mapper),
        ),
        { removeUndefinedValues: true, convertEmptyValues: true },
      ),
    }),
  );
}

async function getContact(email, slackID) {
  console.log({ event: "Get contact", email, slackID });
  const resp = await db.send(
    new GetItemCommand({
      TableName: "contacts",
      Key: {
        email: { S: email },
        slackID: { S: slackID },
      },
    }),
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

async function getAttendeeByEmail(email, year) {
  console.log({ event: "Get attendee", year, email });
  const resp = await db.send(
    new ScanCommand({
      TableName: "attendees",
      FilterExpression: "#email = :email and #year = :year",
      ExpressionAttributeValues: {
        ":email": { S: email },
        ":year": { N: year.toString() },
      },
      ExpressionAttributeNames: {
        "#email": "email",
        "#year": "year",
      },
    }),
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

async function deleteAttendee(slackID, year) {
  console.log({ event: "Delete attendee", slackID, year });
  return db.send(
    new DeleteItemCommand({
      TableName: "attendees",
      Key: {
        slackID: { S: slackID },
        year: { N: year.toString() },
      },
    }),
  );
}

async function getRegistration(email, year) {
  console.log({ event: "Get registration", email, year });
  const resp = await db.send(
    new GetItemCommand({
      TableName: "registrations",
      Key: {
        email: { S: email },
        year: { N: year.toString() },
      },
    }),
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

function updateAttendee(attendee, user) {
  console.log({ event: "Update attendee", slackID: user.id });
  return db.send(
    new PutItemCommand({
      TableName: "attendees",
      Item: marshall(
        Object.assign({}, attendee, {
          email: user.profile.email ?? attendee.email,
          name: user.profile.real_name ?? attendee.name,
          image: user.profile.image_512,
          company: user.profile?.fields?.Xf03A7A5815F?.alt ?? attendee.company,
        }),
        { removeUndefinedValues: true, convertEmptyValues: true },
      ),
    }),
  );
}

function updateContact(contact, user) {
  console.log({ event: "Update contact", slackID: user.id });
  return db.send(
    new PutItemCommand({
      TableName: "contacts",
      Item: marshall(
        Object.assign({}, contact, {
          email: user.profile.email ?? contact.email,
          name: user.profile.real_name ?? contact.name,
          image: user.profile.image_512,
          company: user.profile?.fields?.Xf03A7A5815F?.alt ?? contact.company,
        }),
        { removeUndefinedValues: true, convertEmptyValues: true },
      ),
    }),
  );
}

async function updateAttendeeAnnouncement({ slackID, year }, announcement) {
  const result = await db.send(
    new UpdateItemCommand({
      TableName: process.env.db_table_attendees,
      Key: {
        slackID: { S: slackID },
        year: { N: year.toString() },
      },
      UpdateExpression: "SET announcement = :announcement",
      ExpressionAttributeValues: {
        ":announcement": marshall(announcement, { removeUndefinedValues: true }),
      },
    }),
  );
  return result;
}

async function sendWelcomeMessage({ slackID, year }) {
  console.log({ event: "Send welcome message", slackID });
  const attendee = await getAttendee(slackID, year);
  if (!attendee) {
    console.log({ event: "No attendee found", slackID });
    return;
  }
  const { channel, ts } = await sendMessageToSlack({
    slackID: attendee.slackID,
    name: attendee.name,
    image: attendee.image,
    travel: attendee.travel,
    ticketType: attendee.ticketType,
  });
  await updateAttendeeAnnouncement(attendee, { channel, ts });
}

async function onTeamJoin({ user }) {
  const { email } = user.profile;
  const { year } = process.env;
  console.log({ event: "Team join", email });
  const [registration, attendee] = await Promise.all([
    getRegistration(email, year),
    getAttendeeByEmail(email, year),
  ]);
  if (attendee) {
    console.log({ event: "Attendee already exists", email });
    await Promise.all([
      deleteAttendee(attendee.slackID, attendee.year),
      updateAttendee(Object.assign({}, attendee, { slackID: user.id }), user),
      postChatMessage(
        user.id,
        `Ahoj, táborníku,

Vítej v našem slacku. Hacker Camp se blíží. Snad se těšíš stejně jako my.

Nastav si, prosím, svou profilovou fotku, ať tě ostatní poznají nejen
v kanále #kdo_prijede_na_camp (za 15 min tě tam ohlásíme, tak šup).

Můžeš se připojit k jakémukoliv kanálu, který Tě zajímá.
Můžeš sledovat novinky o #program, festivalovém line-upu i nám z org týmu koukat pod ruce.
Nebo se můžeš kouknout, kde a jak zapojit své ruce k dílu → #hands_wanted.

Pokud chceš nebo nabízíš spolujízdu na camp, tak tady → #spolujizda.
Pokud nabízíš volné místo ve stanu či chatce, tak tu → #spolubydleni.
Důležité novinky najdeš v kanále #general.

Máš otázky? Neváhej se na nás obrátit. Help line: team@hackercamp.cz`,
      ),
    ]);
  } else if (registration && !registration.paid) {
    console.log({ event: "Registration not paid", email });
    await Promise.all([
      createContact(user),
      postChatMessage(
        user.id,
        `Ahoj, táborníku,

Vítej v našem slacku. Hacker Camp se blíží. Snad se těšíš stejně jako my.

Nastav si, prosím, svou profilovou fotku, ať tě ostatní poznají.

Nejspíše ses sem dostals dříve než bys měls. Na další kroky budeš muset počkat,
až ti přijde faktura a ty ji zaplatíš. :) Zatím užívej naší komunitu!

Máš otázky? Neváhej se na nás obrátit. Help line: team@hackercamp.cz`,
      ),
    ]);
  } else if (registration?.paid) {
    console.log({ event: "Registration paid", email });
    await Promise.all([
      createContact(user),
      createAttendee(user, registration),
      postChatMessage(
        user.id,
        `Ahoj, táborníku,

Vítej v našem slacku. Hacker Camp se blíží. Snad se těšíš stejně jako my.

Nastav si, prosím, svou profilovou fotku, ať tě ostatní poznají nejen
v kanále #kdo_prijede_na_camp (za 15 min tě tam ohlásíme, tak šup).

Můžeš se připojit k jakémukoliv kanálu, který Tě zajímá.
Můžeš sledovat novinky o #program, festivalovém line-upu i nám z org týmu koukat pod ruce.
Nebo se můžeš kouknout, kde a jak zapojit své ruce k dílu → #hands_wanted.

Pokud chceš nebo nabízíš spolujízdu na camp, tak tady → #spolujizda.
Pokud nabízíš volné místo ve stanu či chatce, tak tu → #spolubydleni.
Důležité novinky najdeš v kanále #general.

Máš otázky? Neváhej se na nás obrátit. Help line: team@hackercamp.cz`,
      ),
      sendWelcomeMessage({ slackID: user.id, year }),
    ]);
  }
}

async function onUserProfileChanged({ user }) {
  const { email } = user.profile;
  const { year } = process.env;
  console.log({ event: "Profile update", email });
  const [contact, attendee] = await Promise.all([
    getContact(email, user.id),
    getAttendee(user.id, year),
  ]);
  if (!contact) {
    console.log({ event: "Contact not found", email, slackID: user.id });
    return;
  }
  await updateContact(contact, user);
  if (attendee) await updateAttendee(attendee, user);
}

async function dispatchMessageByType(message) {
  switch (message.event) {
    case "team-join":
      await onTeamJoin(message.payload);
      break;
    case "user-profile-changed":
      await onUserProfileChanged(message.payload);
      break;
    case "send-welcome-message":
      await sendWelcomeMessage(message);
      break;
    // TODO: Move all slack messages here
    default:
      throw new Error("Unknown event: " + message.event);
  }
}

/**
 * @param {SQSEvent} event
 * @returns {Promise<void>}
 */
export async function sqsSlack(event) {
  rollbar.configure({ payload: { event } });
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      await dispatchMessageByType(message);
    } catch (err) {
      rollbar.error(err);
    }
  }
}

export const handler = rollbar.lambdaHandler(sqsSlack);
