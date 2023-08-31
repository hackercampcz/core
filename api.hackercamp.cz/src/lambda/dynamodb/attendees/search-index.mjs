import { unmarshall } from "@aws-sdk/util-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { getAttendeesProjection } from "@hackercamp/lib/search.mjs";
import createSearchClient from "algoliasearch";
import { fromJS } from "immutable";
import Rollbar from "../../rollbar.mjs";

/** @typedef {import("aws-lambda").DynamoDBStreamEvent} DynamoDBStreamEvent */
/** @typedef {import("algoliasearch").SearchIndex} SearchIndex */

const rollbar = Rollbar.init({ lambdaName: "dynamodb-reindex-attendees" });

const keysToIndex = new Set([
  "year",
  "slackID",
  "email",
  "company",
  "name",
  "paid",
  "invoiced",
  "ticketType",
  "travel",
  "housing",
  "nfcTronData",
]);

function openAlgoliaClient() {
  const { algolia_app_id, algolia_admin_key } = process.env;
  return createSearchClient(algolia_app_id, algolia_admin_key);
}

function openAlgoliaIndex() {
  const { algolia_index_name } = process.env;
  const algolia = openAlgoliaClient();
  return algolia.initIndex(algolia_index_name);
}

/**
 * @param {DynamoDBStreamEvent} event
 * @param {SearchIndex} searchIndex
 */
async function deleteRemovedItems(event, searchIndex) {
  const deletedAttendees = event.Records.filter(
    (x) => x.eventName === "REMOVE"
  ).map(
    (x) => `${x.dynamodb.OldImage.year.N}-${x.dynamodb.OldImage.slackID.S}`
  );

  if (deletedAttendees.length > 0) {
    console.log({ event: "Removing attendees from index", deletedAttendees });
    await searchIndex.deleteObjects(deletedAttendees);
  }
}

/**
 * @param {DynamoDBStreamEvent} event
 * @param {SearchIndex} searchIndex
 */
async function updateAttendeesIndex(event, searchIndex) {
  const updatedAttendees = event.Records.filter((x) => x.eventName !== "REMOVE")
    .map((x) => [
      fromJS(selectKeys(unmarshall(x.dynamodb.NewImage), keysToIndex)),
      x.dynamodb.OldImage
        ? fromJS(selectKeys(unmarshall(x.dynamodb.OldImage), keysToIndex))
        : null,
    ])
    .filter(([n, o]) => !n.equals(o))
    .map(([n]) => n.toJS())
    .map(getAttendeesProjection());
  if (updatedAttendees.length > 0) {
    console.log({
      event: "Updating attendees index",
      updatedAttendees: updatedAttendees.map((x) => x.objectID),
    });
    await searchIndex.saveObjects(updatedAttendees);
  }
}

/**
 * @param {DynamoDBStreamEvent} event
 * @returns {Promise<void>}
 */
async function indexUpdate(event) {
  try {
    const searchIndex = openAlgoliaIndex();
    await Promise.all([
      deleteRemovedItems(event, searchIndex),
      updateAttendeesIndex(event, searchIndex),
    ]);
  } catch (err) {
    rollbar.error(err);
  }
}

export const handler = rollbar.lambdaHandler(indexUpdate);
