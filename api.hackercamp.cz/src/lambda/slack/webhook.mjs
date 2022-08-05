import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { attributes } from "@hackercamp/lib/attendee.mjs";
import {
  internalError,
  notFound,
  readPayload,
  response,
  unprocessableEntity,
  withCORS,
} from "../http.mjs";
import { postChatMessage, sendMessageToSlack } from "../slack.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

function createContact({ id, profile }) {
  console.log({ event: "Create contact", slackID: id });
  return db.send(
    new PutItemCommand({
      TableName: "hc-contacts",
      Item: marshall(
        {
          email: profile.email,
          slackID: id,
          name: profile.real_name,
          image: profile.image_512,
        },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
}

async function createAttendee({ id, profile }, record) {
  console.log({ event: "Create attendee", slackID: id });
  return db.send(
    new PutItemCommand({
      TableName: "hc-attendees",
      Item: marshall(
        Object.assign(
          {},
          {
            email: profile.email,
            slackID: id,
            name: profile.real_name,
            image: profile.image_512,
          },
          selectKeys(record, attributes)
        ),
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
}

async function getContact(email, slackID) {
  console.log({ event: "Get contact", email, slackID });
  const resp = await db.send(
    new GetItemCommand({
      TableName: "hc-contacts",
      Key: marshall(
        { email, slackID },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

async function getAttendee(slackID, year) {
  console.log({ event: "Get attendee", year, slackID });
  const resp = await db.send(
    new GetItemCommand({
      TableName: "hc-attendees",
      Key: marshall(
        { slackID, year },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

async function getRegistration(email, year) {
  console.log({ event: "Get registration", email, year });
  const resp = await db.send(
    new GetItemCommand({
      TableName: "hc-registrations",
      Key: marshall(
        { email, year },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

function updateAttendee(attendee, user) {
  console.log({ event: "Update attendee", slackID: user.id });
  return db.send(
    new PutItemCommand({
      TableName: "hc-attendees",
      Item: marshall(
        Object.assign({}, attendee, {
          name: user.profile.real_name || attendee.name,
          image: user.profile.image_512,
          company: user.profile?.fields?.Xf03A7A5815F?.alt || attendee.company,
        }),
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
}

function updateContact(contact, user) {
  console.log({ event: "Update contact", slackID: user.id });
  return db.send(
    new PutItemCommand({
      TableName: "hc-contacts",
      Item: marshall(
        Object.assign({}, contact, {
          name: user.profile.real_name || contact.name,
          image: user.profile.image_512,
          company: user.profile?.fields?.Xf03A7A5815F?.alt || contact.company,
        }),
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
}

async function onUrlVerification(payload) {
  return response({ challenge: payload.challenge });
}

async function onTeamJoin({ user }) {
  const { email } = user.profile;
  console.log({ event: "Team join", email });
  const registration = await getRegistration(email, 2022);
  if (!registration) {
    console.log({ event: "Registration not found", email });
    return notFound();
  }
  await Promise.all([
    createContact(user),
    createAttendee(user, registration),
    postChatMessage(
      user.id,
      `Ahoj, táborníku,

Vítej v našem slacku. Začátek září se blíží. Snad se těšíš stejně jako my.

Nastav si svou profilovou fotku, ať tě ostatní poznají.

Můžeš se připojit k jakémukoliv kanálu, který Tě zajímá. Můžeš sledovat novinky o #program, festivalovém line-upu i nám z org týmu koukat pod ruce. Nebo se můžeš kouknout, kde a jak zapojit své ruce k dílu → #hands_wanted.

Chceš se inspirovat tím, co další táborníci chystají jako svoje zapojení Pokud chceš nebo nabízíš spolujízdu na camp, tak tady → #spolujizda. Pokud nabízíš volné místo ve stanu či chatce, tak tu → #spolubydleni. Důležité novinky najdeš v kanále #general.

Máš otázky? Neváhej se na nás obrátit. Help line: team@hackercamp.cz`
    ),
    // TODO: schedule following after 3h
    sendMessageToSlack({
      slackID: user.id,
      name: user.profile.real_name,
      image: user.profile.image_512,
    }),
  ]);
  return response("");
}

async function onUserProfileChanged({ user }) {
  const { email } = user.profile;
  console.log({ event: "Profile update", email });
  const [contact, attendee] = await Promise.all([
    getContact(email, user.id),
    getAttendee(user.id, 2022),
  ]);
  if (!contact) {
    console.log({ event: "Contact not found", email, slackID: user.id });
    return notFound();
  }
  await updateContact(contact, user);
  if (attendee) await updateAttendee(attendee, user);
  return response("");
}

function dispatchByType(event) {
  switch (event.type) {
    case "url_verification":
      return onUrlVerification(event);
    case "team_join":
      return onTeamJoin(event);
    case "user_profile_changed":
      return onUserProfileChanged(event);
    default:
      console.log({ event: "Unknown event", payload: event });
      return Promise.resolve(unprocessableEntity());
  }
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const withCORS_ = withCORS(["POST", "OPTIONS"], event.headers["origin"]);
  try {
    const payload = readPayload(event);
    // TODO: push this to queue instead
    return dispatchByType(payload.event).then((x) => withCORS_(x));
  } catch (err) {
    console.error(err);
    return withCORS_(internalError());
  }
}
