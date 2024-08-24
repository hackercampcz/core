import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { accepted, errorResponse, getHeader, readPayload, response, unprocessableEntity, withCORS } from "../http.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef {import("@pulumi/awsx/classic/apigateway").Request} APIGatewayProxyEvent */
/** @typedef {import("@pulumi/awsx/classic/apigateway").Response} APIGatewayProxyResult */

const queue = new SQSClient({});
const rollbar = Rollbar.init({ lambdaName: "slack-webhook" });

async function onUrlVerification({ challenge }) {
  return response({ challenge });
}

async function enqueueHandler(event, payload, delay) {
  console.log({ event: "Enqueue handler", eventType: event, email: payload.user?.profile?.email });
  const resp = await queue.send(
    new SendMessageCommand({
      QueueUrl: process.env.slack_queue_url,
      MessageBody: JSON.stringify({ event, payload }),
      DelaySeconds: delay
    })
  );
  return resp;
}

function dispatchByType(event) {
  const { type, ...payload } = event;
  switch (type) {
    case "url_verification":
      return onUrlVerification(event);
    case "team_join":
      return enqueueHandler("team-join", payload).then(() => accepted());
    case "user_profile_changed":
      // Delay user profile change, because it can occur before `team-join` in some circumstances
      // and we can lose this change due to race condition (contact or attendee doesn't exist yet)
      // so it is better to wait a minute with this
      return enqueueHandler("user-profile-changed", payload, 60).then(() => accepted());
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
  rollbar.configure({ payload: { event } });
  const withCORS_ = withCORS(["POST", "OPTIONS"], getHeader(event.headers, "Origin"));
  try {
    const payload = readPayload(event);
    // TODO: validate webhook token
    return await dispatchByType(payload.event ?? payload).then((x) => withCORS_(x));
  } catch (err) {
    rollbar.error(err);
    return withCORS_(errorResponse(err));
  }
}

export const handler = rollbar.lambdaHandler(slackWebhook);
