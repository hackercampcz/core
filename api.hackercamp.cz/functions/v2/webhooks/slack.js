import { createSQSClient } from "#lib/sqs.js";
import { SendMessageCommand } from "@aws-sdk/client-sqs";

/** @typedef { import("@aws-sdk/client-sqs").SQSClient } SQSClient */
/** @typedef { import("@aws-sdk/client-sqs").SendMessageCommandOutput } SendMessageCommandOutput */

async function onUrlVerification({ challenge }) {
  return Response.json({ challenge });
}

/**
 * @param {Env} env
 * @param {String} event
 * @param {any} payload
 * @param {Number} delay
 * @returns {Promise<SendMessageCommandOutput>}
 */
async function enqueueHandler(env, event, payload, delay = 0) {
  console.log({ event: "Enqueue handler", eventType: event, email: payload.user?.profile?.email });
  const queue = createSQSClient(env);
  const resp = await queue.send(
    new SendMessageCommand({
      QueueUrl: env.slack_queue_url,
      MessageBody: JSON.stringify({ event, payload }),
      DelaySeconds: delay
    })
  );
  return resp;
}

/**
 * @param {Env} env
 * @param {any} event
 * @returns {Promise<Response|*>}
 */
async function dispatchByType(env, event) {
  const { type, ...payload } = event;
  switch (type) {
    case "url_verification":
      return onUrlVerification(event);
    case "team_join":
      await enqueueHandler(env, "team-join", payload);
      return new Response(null, { status: 202 });
    case "user_profile_changed":
      // Delay user profile change, because it can occur before `team-join` in some circumstances
      // and we can lose this change due to race condition (contact or attendee doesn't exist yet)
      // so it is better to wait a minute with this
      await enqueueHandler(env, "user-profile-changed", payload, 60);
      return new Response(null, { status: 202 });
    default:
      console.log({ event: "Unknown event", payload: event });
      return new Response(null, { status: 422 });
  }
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env, data: { rollbar } }) {
  const payload = await request.json();
  const token = new URL(request.url).searchParams.get("token");

  if (token !== env.slack_webhook_token) {
    return new Response(null, { status: 401 });
  }

  return await dispatchByType(env, payload.event ?? payload);
}
