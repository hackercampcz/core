import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  internalError,
  notFound,
  readPayload,
  response,
  unprocessableEntity,
  withCORS,
} from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

async function onUrlVerification(payload) {
  return response({ challenge: payload.challenge });
}

async function onTeamJoin({ user }) {
  // TODO: implement new team member
  console.log("Team join");
  console.log({ user });
  return notFound();
}

async function getContact(email, slackID) {
  const resp = await db.send(
    new GetItemCommand({
      TableName: "hc-contacts",
      Key: marshall({ email, slackID }),
    })
  );
  const contact = unmarshall(resp.Item);
  return contact;
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

async function onUserProfileChanged({ user }) {
  // TODO: implement profile change
  // - update attendee
  const contact = await getContact(user.profile.email, user.id);
  if (!contact) return notFound();
  await updateContact(contact, user);
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
    return dispatchByType(payload.event).then((x) => withCORS_(x));
  } catch (err) {
    console.error(err);
    return withCORS_(internalError());
  }
}
