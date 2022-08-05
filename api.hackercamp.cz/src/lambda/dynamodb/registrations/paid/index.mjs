import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { attributes } from "@hackercamp/lib/attendee.mjs";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { sendEmailWithTemplate, Template } from "../../../postmark.mjs";
import { sendMessageToSlack } from "../../../slack.mjs";

/** @typedef { import("aws-lambda").DynamoDBStreamEvent } DynamoDBStreamEvent */

const dynamo = new DynamoDBClient({});

async function getContact(dynamodb, email) {
  console.log({ event: "Get contact", email });
  const res = await dynamo.send(
    new ScanCommand({
      TableName: "hc-contacts",
      FilterExpression: "email = :email",
      ExpressionAttributeValues: marshall(
        { ":email": email },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x))?.[0];
}

function createAttendee(dynamo, contact, record) {
  console.log({ event: "Create attendee", contact, record });
  return dynamo.send(
    new PutItemCommand({
      TableName: "hc-attendees",
      Item: marshall(
        Object.assign(
          {},
          selectKeys(contact, new Set(["slackID", "name", "image"])),
          selectKeys(record, attributes)
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
  console.log({ event: "Slack invitation sent", email });
}

async function handlePaidRegistrations(event) {
  const newlyPaidRegistrations = event.Records.filter(
    (x) => x.eventName === "MODIFY"
  )
    .map((x) => ({
      newImage: unmarshall(x.dynamodb.NewImage),
      oldImage: unmarshall(x.dynamodb.OldImage),
    }))
    .filter((x) => x.newImage.paid && !x.oldImage.paid)
    .map((x) => x.newImage);
  for (const record of newlyPaidRegistrations) {
    const { email } = record;
    const contact = await getContact(dynamo, email);
    if (!contact) {
      console.log({ event: "No contact found", email });
      await sendSlackInvitation(email, process.env.postmark_token);
    } else {
      await Promise.all([
        createAttendee(dynamo, contact, record),
        sendMessageToSlack(contact),
      ]);
    }
  }
}

/**
 * @param {DynamoDBStreamEvent} event
 * @returns {Promise<void>}
 */
export async function handler(event) {
  await handlePaidRegistrations(event);
}
