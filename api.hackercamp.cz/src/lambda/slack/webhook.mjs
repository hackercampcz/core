import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import {
  internalError,
  notFound,
  readPayload,
  response,
  unprocessableEntity,
  withCORS,
} from "../http.mjs";
import { sendMessageToSlack } from "../slack.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

function createContact({ id, profile }) {
  return db.send(
    new PutItemCommand({
      TableName: "hc-contacts",
      Item: marshall({
        email: profile.email,
        slackID: id,
        name: profile.real_name,
        image: profile.image_512,
      }),
    })
  );
}

async function createAttendee({ id, profile }, record) {
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
          selectKeys(record, new Set(attendee.attributes))
        )
      ),
    })
  );
}

async function getContact(email, slackID) {
  const resp = await db.send(
    new GetItemCommand({
      TableName: "hc-contacts",
      Key: marshall({ email, slackID }),
    })
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

async function getAttendee(slackID, year) {
  const resp = await db.send(
    new GetItemCommand({
      TableName: "hc-attendees",
      Key: marshall({ slackID, year }),
    })
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

async function getRegistration(email, year) {
  const resp = await db.send(
    new GetItemCommand({
      TableName: "hc-registrations",
      Key: marshall({ email, year }),
    })
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

function updateAttendee(attendee, user) {
  return db.send(
    new PutItemCommand({
      TableName: "hc-attendees",
      Item: marshall(
        Object.assign({}, attendee, {
          name: user.profile.real_name || attendee.name,
          image: user.profile.image_512,
          company: user.profile?.fields?.Xf03A7A5815F?.alt || attendee.company,
        })
      ),
    })
  );
}

function updateContact(contact, user) {
  return db.send(
    new PutItemCommand({
      TableName: "hc-contacts",
      Item: marshall(
        Object.assign({}, contact, {
          name: user.profile.real_name || contact.name,
          image: user.profile.image_512,
          company: user.profile?.fields?.Xf03A7A5815F?.alt || contact.company,
        })
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
  await Promise.all([
    createContact(user),
    createAttendee(user, registration),
    sendMessageToSlack({
      slackID: user.id,
      name: user.profile.real_name,
      image: user.profile.image_512,
    }),
  ]);
  return response("");
}

async function onUserProfileChanged({ user }) {
  const [contact, attendee] = await Promise.all([
    getContact(user.profile.email, user.id),
    getAttendee(user.id, 2022),
  ]);
  if (!contact) return notFound();
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
      console.log({ msg: "Unknown event", event });
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
