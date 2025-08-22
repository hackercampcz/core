import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import Rollbar from "../../rollbar.mjs";

/** @typedef { import("aws-lambda").DynamoDBStreamEvent } DynamoDBStreamEvent */

const queue = new SQSClient({});

const rollbar = Rollbar.init({ lambdaName: "dynamodb-checkin" });

function enqueueNfcTronCheckIn({ slackID, year }) {
  console.log({ event: "Scheduling NFCTron chip pairing", slackID, year });
  return queue.send(
    new SendMessageCommand({
      QueueUrl: process.env.nfctron_queue_url,
      DelaySeconds: 300, // 5 min delay
      MessageBody: JSON.stringify({ event: "check-in", payload: { slackID, year } })
    })
  );
}
/**
 * @param {DynamoDBStreamEvent} event
 * @returns {Promise<void>}
 */
async function checkIns(event) {
  rollbar.configure({ payload: { event } });
  const checkedInAttendees = event.Records
    .filter(x => x.eventName === "MODIFY")
    .map(x => ({
      newImage: unmarshall(x.dynamodb.NewImage),
      oldImage: unmarshall(x.dynamodb.OldImage)
    }))
    .filter(x => x.newImage.checkIn && !x.oldImage.checkIn)
    .map(x => x.newImage);
  for (const record of checkedInAttendees) {
    const { slackID, year } = record;
    await enqueueNfcTronCheckIn({ slackID, year: parseInt(year) });
  }
}

export const handler = rollbar.lambdaHandler(checkIns);
