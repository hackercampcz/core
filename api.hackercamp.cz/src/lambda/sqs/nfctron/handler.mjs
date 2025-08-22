import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { attributes, mapper } from "@hackercamp/lib/attendee.js";
import { selectKeys } from "@hackercamp/lib/object.js";
import Rollbar from "../../rollbar.mjs";

/** @typedef {import("aws-lambda").SQSEvent} SQSEvent */

const db = new DynamoDBClient({});
const rollbar = Rollbar.init({ lambdaName: "sqs-nfctron" });
const { db_table_attendees } = process.env;

// TODO: fetch pairing table from api/v2/nfctron
// * get chipId by serialNumber from pairing table
// * update attendees.nfcTronData[x].chipID

async function getAttendee({ slackID, year }) {
  console.log({ event: "Get attendee", year, slackID });
  const resp = await db.send(
    new GetItemCommand({
      TableName: db_table_attendees,
      Key: { slackID: { S: slackID }, year: { N: year.toString() } }
    })
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

function updateAttendee(attendee) {
  console.log({ event: "Update attendee", slackID: attendee.slackID });
  return db.send(
    new PutItemCommand({
      TableName: db_table_attendees,
      Item: marshall(attendee, { removeUndefinedValues: true, convertEmptyValues: true })
    })
  );
}

async function getPairingTable() {
  const resp = await fetch("https://api.hackercamp.cz/v2/nfctron");
  const data = await resp.json();
  return new Map(data.map(x => [x.serialNumber, x.chipId]));
}

async function onAttendeeCheckIn({ key }, env) {
  const pairingTable = await getPairingTable();
  const attendee = await getAttendee(key);
  if (!attendee) return;
  for (const chip of attendee.nfcTronData.filter(x => !x.chipID)) {
    chip.chipID = pairingTable.get(chip.serialNumber);
  }
  await updateAttendee(attendee);
}

async function dispatchMessageByType(message) {
  switch (message.event) {
    case "check-in":
      await onAttendeeCheckIn(message.payload, process.env);
      break;
    default:
      throw new Error("Unknown event: " + message.event);
  }
}

/**
 * @param {SQSEvent} event
 * @returns {Promise<void>}
 */
export async function sqsNfcTron(event) {
  rollbar.configure({ payload: { event } });
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      await dispatchMessageByType(message);
    } catch (err) {
      rollbar.error(err);
    }
  }
}

export const handler = rollbar.lambdaHandler(sqsNfcTron);
