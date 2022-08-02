import {
  DynamoDBClient,
  UpdateItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
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

function onUrlVerification(payload) {
  return response({ challenge: payload.challenge });
}

function onTeamJoin({ user }) {
  // TODO: implement new team member
  console.log("Team join");
  console.log({ user });
  return notFound();
}

function onUserProfileChanged({ user }) {
  // TODO: implement profile change
  // - update contact, update attendee
  console.log("User profile changed");
  console.log({ user });
  return notFound();
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
      return unprocessableEntity();
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
    return withCORS_(dispatchByType(payload.event));
  } catch (err) {
    console.error(err);
    return withCORS_(internalError());
  }
}
