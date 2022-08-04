import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import * as attendee from "@hackercamp/lib/attendee.mjs";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { sendEmailWithTemplate, Template } from "../../../postmark.mjs";
import { sendMessageToSlack } from "../../../slack.mjs";

/** @typedef { import("aws-lambda").DynamoDBStreamEvent } DynamoDBStreamEvent */

const dynamo = new DynamoDBClient({});

async function getContact(dynamodb, email) {
  const res = await dynamo.send(
    new GetItemCommand({
      TableName: "hc-contacts",
      Key: marshall(
        { email },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
  return res.Item ? unmarshall(res.Item) : null;
}

function createAttendee(dynamo, contact, record) {
  return dynamo.send(
    new PutItemCommand({
      TableName: "hc-attendees",
      Item: marshall(
        Object.assign(
          {},
          selectKeys(contact, new Set(["slackID", "name", "image"])),
          selectKeys(record, new Set(attendee.attributes))
        )
      ),
    })
  );
}

async function sendSlackInvitation(email, postmarkToken) {
  await sendEmailWithTemplate({
    token: postmarkToken,
    from: "Hacker Camp Crew <team@hackercamp.cz>",
    to: email,
    templateId: Template.SlackInvite,
    data: {},
  });
  console.log(`${email} sent`);
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
      await sendSlackInvitation(email, process.env.postmark_token);
    } else {
      await Promise.all([
        createAttendee(dynamo, contact, record),
        sendMessageToSlack(contact),
      ]);
    }
  }
}
