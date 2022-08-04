import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import * as attendee from "@hackercamp/lib/attendee.mjs";

/** @typedef { import("aws-lambda").DynamoDBStreamEvent } DynamoDBStreamEvent */

const dynamo = new DynamoDBClient({});

async function getContact(dynamodb, email) {
  const res = await dynamo.send(
    new GetItemCommand({
      TableName: "hc-contacts",
      Key: marshall({ email }),
    })
  );
  return unmarshall(res.Item);
}

async function createAttendee(dynamo, contact, record) {
  const res = await dynamo.send(
    new PutItemCommand({
      TableName: "hc-attendees",
      Item: marshall(
        Object.assign(
          {},
          selectKeys(contact, new Set(["slackID", "name"])),
          selectKeys(record, new Set(attendee.attributes))
        )
      ),
    })
  );
}

/**
 * @param {DynamoDBStreamEvent} event
 * @returns {Promise<void>}
 */
export async function handler(event) {
  const newlyPaidRegistrations = event.Records.filter(
    (x) => x.eventName === "MODIFY"
  )
    .map((x) => unmarshall(x.dynamodb))
    .filter((x) => x.NewImage.paid && !x.OldImage.paid)
    .map((x) => x.NewImage);
  for (const record of newlyPaidRegistrations) {
    const { email } = record;
    const contact = await getContact(dynamo, email);
    if (!contact) {
      console.log(`No contact found for e-mail: ${email}`);
    } else {
      await createAttendee(dynamo, contact, record);
    }
    // TODO: check `hc-contacts` by `email`
    // if none contact, send Slack Invite
    // else create attendee
  }
}
