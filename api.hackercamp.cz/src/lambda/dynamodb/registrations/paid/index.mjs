import { fetch } from "@adobe/helix-fetch";
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

const actions = [
  "Znáte se? -> 😈",
  "Chceš se potkat na campu? -> 🙋",
  "Tešíš se? -> 🤩",
  "Dáte drink? -> 🍻",
  "Zapaříte? -> 🕺🏼",
  "Prokecáte celý camp? -> 🗣",
  "Hmm, netušíš, co si můžete říct? Zkusíš to na campu prolomit? -> 🦀",
  "Přijde Ti povědomí? Nepleteš se? Tak to na campu rozseknete? -> 🥓",
  "Potřebuješ se seznámit? -> 🍆",
  "Nemůžeš si ho/ji nechat ujít? -> 🥑",
];

function getActions() {
  const a = Math.round(actions.length * Math.random()) - 1;
  const b = Math.round(actions.length * Math.random()) - 1;
  return [actions[a], actions[b]];
}

async function sendMessageToSlack(profile) {
  const resp = await fetch(
    process.env.SLACK_WEBHOOK_URL,
    {
      method: "POST",
      body: {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: [`Hey! <@${profile.slackID}> s námi letos jede na camp.`]
                .concat(getActions())
                .join("\n"),
            },
            accessory: {
              type: "image",
              image_url: profile.image,
              alt_text: profile.name,
            },
          },
        ],
      },
    }
  );
  return resp.json();
}

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
          selectKeys(contact, new Set(["slackID", "name", "image"])),
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

    // TODO: check `hc-contacts` by `email`
    // if none contact, send Slack Invite
    // else create attendee
    const contact = await getContact(dynamo, email);
    if (!contact) {
      console.log(`No contact found for e-mail: ${email}`);
    } else {
      await Promise.all([
        createAttendee(dynamo, contact, record),
        sendMessageToSlack(contact),
      ]);
    }
  }
}
