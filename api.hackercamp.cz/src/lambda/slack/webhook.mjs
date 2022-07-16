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

function onTeamJoin(payload) {
  // todo: implement new team member
  return notFound();
}

function dispatchByType(payload) {
  switch (payload.type) {
    case "url_verification":
      return onUrlVerification(payload);
    case "team_join":
      return onTeamJoin(payload);
    default:
      console.log({ event: "Unknown event", payload });
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
    console.log(payload);
    return withCORS_(dispatchByType(payload));
  } catch (err) {
    console.error(err);
    return withCORS_(internalError());
  }
}
