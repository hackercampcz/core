import { DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { attributes, mapper } from "@hackercamp/lib/attendee.js";
import { selectKeys } from "@hackercamp/lib/object.js";
import { sendEmailWithTemplate, Template } from "../../postmark.mjs";
import Rollbar from "../../rollbar.mjs";

/** @typedef { import("aws-lambda").DynamoDBStreamEvent } DynamoDBStreamEvent */

const dynamo = new DynamoDBClient({});
const queue = new SQSClient({});

const rollbar = Rollbar.init({ lambdaName: "dynamodb-paid-registrations" });

export async function getContact(dynamo, email) {
  console.log({ event: "Get contact", email });
  const res = await dynamo.send(
    new ScanCommand({
      TableName: "contacts",
      FilterExpression: "email = :email",
      ExpressionAttributeValues: marshall({ ":email": email }, {
        removeUndefinedValues: true,
        convertEmptyValues: true
      })
    })
  );
  return res.Items.map(x => unmarshall(x))?.[0];
}

function createAttendee(dynamo, contact, record) {
  console.log({ event: "Create attendee", contact, record });
  return dynamo.send(
    new PutItemCommand({
      TableName: "attendees",
      Item: marshall(
        Object.assign(
          {},
          selectKeys(contact, new Set(["slackID", "name", "image", "slug"])),
          selectKeys(record, attributes, mapper)
        )
      )
    })
  );
}

async function sendSlackInvitation(email, postmarkToken) {
  await sendEmailWithTemplate({
    token: postmarkToken,
    to: email,
    templateId: Template.SlackInvite,
    data: {},
    tag: "slack-invitation"
  });
  console.log({ event: "Slack invitation sent", email });
}

function enqueueSlackWelcomeMessage(user) {
  console.log({ event: "Scheduling announcement on Slack", slackID: user.id });
  return queue.send(
    new SendMessageCommand({
      QueueUrl: process.env.slack_queue_url,
      DelaySeconds: 900, // 15 min delay
      MessageBody: JSON.stringify({ event: "send-welcome-message", slackID: user.id, year: user.year })
    })
  );
}

async function getAttendee(dynamo, slackID, year) {
  console.log("Get attendee", { slackID, year });
  const result = await dynamo.send(
    new GetItemCommand({
      TableName: "attendees",
      Key: { slackID: { S: slackID }, year: { N: year.toString() } }
    })
  );
  return result.Item;
}
/**
 * @param {DynamoDBStreamEvent} event
 * @returns {Promise<void>}
 */
async function paidRegistrations(event) {
  rollbar.configure({ payload: { event } });
  const newlyPaidRegistrations = event.Records
    .filter(x => x.eventName === "MODIFY")
    .map(x => ({
      newImage: unmarshall(x.dynamodb.NewImage),
      oldImage: unmarshall(x.dynamodb.OldImage)
    }))
    .filter(x => x.newImage.paid && !x.oldImage.paid)
    .map(x => x.newImage);
  for (const record of newlyPaidRegistrations) {
    const { email, year } = record;
    const contact = await getContact(dynamo, email);
    if (!contact) {
      console.log({ event: "No contact found", email });
      // TODO: check if we have existing Slack user with the same email first, if so, create contact instead
      // TODO: check if registration `slackID` already exists as a contact, then trigger change the e-mail workflow
      await sendSlackInvitation(email, process.env.postmark_token);
    } else {
      const attendee = await getAttendee(dynamo, contact.slackID, year);
      if (attendee) return;
      await Promise.all([
        createAttendee(dynamo, contact, record),
        enqueueSlackWelcomeMessage({ id: contact.slackID, year: parseInt(year) })
      ]);
    }
  }
}

export const handler = rollbar.lambdaHandler(paidRegistrations);
