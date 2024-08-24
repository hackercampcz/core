import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import Rollbar from "../../rollbar.mjs";
import { getMessage, updateMessage } from "../../slack.mjs";

/** @typedef { import("aws-lambda").DynamoDBStreamEvent } DynamoDBStreamEvent */

const dynamo = new DynamoDBClient({});

const rollbar = Rollbar.init({ lambdaName: "dynamodb-contacts-changed-image" });

async function getAttendee(slackID, year) {
  console.log({ event: "Get attendee", year, slackID });
  const resp = await dynamo.send(
    new GetItemCommand({
      TableName: process.env.db_table_attendees,
      Key: { slackID: { S: slackID }, year: { N: year.toString() } },
      ProjectionExpression: "announcement"
    })
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

/**
 * @param {DynamoDBStreamEvent} event
 * @returns {Promise<void>}
 */
async function imageChanged(event) {
  rollbar.configure({ payload: { event } });
  const { year, slack_bot_token: token } = process.env;
  console.dir({ event: "updated contact", records: event.Records.map(x => x.dynamodb) }, { depth: 8 });
  const changedImages = event.Records.filter((x) => x.eventName === "MODIFY").map((x) => ({
    newImage: unmarshall(x.dynamodb.NewImage),
    oldImage: unmarshall(x.dynamodb.OldImage)
  })).filter((x) => x.newImage.image !== x.oldImage.image).map((x) => x.newImage);
  console.log({ event: "changed images", count: changedImages.length });
  for (const record of changedImages) {
    const { slackID, image } = record;
    const attendee = await getAttendee(slackID, year);
    if (!attendee?.announcement) {
      console.log({ event: "Announcement or attendee not found", slackID, year });
      continue;
    }
    const { blocks: [section] } = await getMessage(token, attendee.announcement);
    section.accessory.image_url = image;
    await updateMessage(token, attendee.announcement, section);
  }
}

export const handler = rollbar.lambdaHandler(imageChanged);
