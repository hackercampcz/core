import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import {
  accepted,
  getHeader,
  internalError,
  readPayload,
  response,
  unprocessableEntity,
  withCORS,
} from "../http.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef {import("@pulumi/awsx/classic/apigateway").Request} APIGatewayProxyEvent */
/** @typedef {import("@pulumi/awsx/classic/apigateway").Response} APIGatewayProxyResult */

const queue = new SQSClient({});
const rollbar = Rollbar.init({ lambdaName: "slack-webhook" });

async function onUrlVerification({ challenge }) {
  return response({ challenge });
}

async function enqueueHandler(event, payload) {
  console.log({
    event: "Enqueue handler",
    eventType: event,
    email: payload.user?.profile?.email,
  });
  try {
    const resp = await queue.send(
      new SendMessageCommand({
        QueueUrl: process.env.slack_queue_url,
        MessageBody: JSON.stringify({ event, payload }),
      })
    );
    return resp;
  } catch (err) {
    rollbar.error(err);
    throw err;
  }
}

function dispatchByType(event) {
  const { type, ...payload } = event;
  switch (type) {
    case "url_verification":
      return onUrlVerification(event);
    case "team_join":
      return enqueueHandler("team-join", payload).then(() => accepted());
    case "user_profile_changed":
      return enqueueHandler("user-profile-changed", payload).then(() =>
        accepted()
      );
    default:
      console.log({ event: "Unknown event", payload: event });
      return Promise.resolve(unprocessableEntity());
  }
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function slackWebhook(event) {
  const withCORS_ = withCORS(
    ["POST", "OPTIONS"],
    getHeader(event.headers, "Origin")
  );
  try {
    const payload = readPayload(event);
    // TODO: validate webhook token
    return await dispatchByType(payload.event ?? payload).then((x) =>
      withCORS_(x)
    );
  } catch (err) {
    rollbar.error(err);
    return withCORS_(internalError());
  }
}

export const handler = rollbar.lambdaHandler(slackWebhook);
