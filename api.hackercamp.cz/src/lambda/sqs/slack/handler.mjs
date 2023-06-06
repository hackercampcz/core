import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { sendMessageToSlack } from "../../slack.mjs";
import Rollbar from "../../rollbar.mjs";

/** @typedef {import("aws-lambda").SQSEvent} SQSEvent */

const db = new DynamoDBClient({});
const rollbar = Rollbar.init({ lambdaName: "sqs-slack" });

async function getAttendee(slackID, year) {
  console.log({ event: "Get attendee", year, slackID });
  const resp = await db.send(
    new GetItemCommand({
      TableName: "hc-attendees",
      Key: {
        slackID: { S: slackID },
        year: { N: year },
      },
    })
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

async function sendWelcomeMessage({ slackID, year }) {
  console.log({ event: "Send welcome message", slackID });
  const attendee = await getAttendee(slackID, year);
  if (!attendee) {
    console.log({ event: "No attendee found", slackID });
    return;
  }
  await sendMessageToSlack({
    slackID: attendee.slackID,
    name: attendee.name,
    image: attendee.image,
    travel: attendee.travel,
    ticketType: attendee.ticketType,
  });
}

async function dispatchMessageByType(message) {
  switch (message.event) {
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
