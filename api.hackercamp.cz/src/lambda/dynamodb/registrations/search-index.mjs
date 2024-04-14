import { unmarshall } from "@aws-sdk/util-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { getRegistrationProjection } from "@hackercamp/lib/search.mjs";
import createSearchClient from "algoliasearch";
import { fromJS } from "immutable";
import Rollbar from "../../rollbar.mjs";

/** @typedef {import("aws-lambda").DynamoDBStreamEvent} DynamoDBStreamEvent */
/** @typedef {import("algoliasearch").SearchIndex} SearchIndex */

const rollbar = Rollbar.init({ lambdaName: "dynamodb-reindex-registrations" });

const keysToIndex = new Set([
  "year",
  "email",
  "company",
  "firstName",
  "lastName",
  "timestamp",
  "invoiced",
  "paid",
  "firstTime",
  "referral",
  "ticketType",
  "approved",
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

let getCrewReferralsCache = null;

async function getCrewReferrals() {
  if (getCrewReferralsCache?.size) return getCrewReferralsCache;
  const resp = await fetch(
    "https://slack.com/api/usergroups.users.list?usergroup=S03EQ1LLYCC",
    { headers: { Authorization: `Bearer ${process.env.slack_bot_token}` } },
  );
  const { users } = await resp.json();
  getCrewReferralsCache = new Set(users);
  return getCrewReferralsCache;
}

/**
 * @param {DynamoDBStreamEvent} event
 * @param {SearchIndex} searchIndex
 */
async function deleteRemovedItems(event, searchIndex) {
  const deletedRegistrations = event.Records.filter(
    (x) => x.eventName === "REMOVE",
  ).map((x) => `${x.dynamodb.OldImage.year.N}-${x.dynamodb.OldImage.email.S}`);

  if (deletedRegistrations.length > 0) {
    console.log({
      event: "Removing registrations from index",
      deletedRegistrations,
    });
    await searchIndex.deleteObjects(deletedRegistrations);
  }
}

/**
 * @param {DynamoDBStreamEvent} event
 * @param {SearchIndex} searchIndex
 */
async function updateRegistrationsIndex(event, searchIndex) {
  const crewReferrals = await getCrewReferrals();
  const updatedRegistrations = event.Records.filter(
    (x) => x.eventName !== "REMOVE",
  )
    .map((x) => [
      fromJS(selectKeys(unmarshall(x.dynamodb.NewImage), keysToIndex)),
      x.dynamodb.OldImage
        ? fromJS(selectKeys(unmarshall(x.dynamodb.OldImage), keysToIndex))
        : null,
    ])
    .filter(([n, o]) => !n.equals(o))
    .map(([n]) => n.toJS())
    .map(getRegistrationProjection(crewReferrals));
  if (updatedRegistrations.length > 0) {
    console.log({
      event: "Updating registrations index",
      updatedRegistrations: updatedRegistrations.map((x) => x.objectID),
    });
    await searchIndex.saveObjects(updatedRegistrations);
  }
}

/**
 * @param {DynamoDBStreamEvent} event
 * @returns {Promise<void>}
 */
async function indexUpdate(event) {
  rollbar.configure({ payload: { event } });
  try {
    const searchIndex = openAlgoliaIndex();
    await Promise.all([
      deleteRemovedItems(event, searchIndex),
      updateRegistrationsIndex(event, searchIndex),
    ]);
  } catch (err) {
    rollbar.error(err);
  }
}

export const handler = rollbar.lambdaHandler(indexUpdate);
