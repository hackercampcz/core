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
    { headers: { Authorization: `Bearer ${process.env.slack_bot_token}` } }
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
  const deletedProducts = event.Records.filter(
    (x) => x.eventName === "REMOVE"
  ).map((x) => `${x.dynamodb.OldImage.year.N}-${x.dynamodb.OldImage.email.S}`);

  if (deletedProducts.length > 0) {
    console.log({ event: "Removing products from index", deletedProducts });
    await searchIndex.deleteObjects(deletedProducts);
  }
}

/**
 * @param {DynamoDBStreamEvent} event
 * @param {SearchIndex} searchIndex
 */
async function updateProductsIndex(event, searchIndex) {
  const crewReferrals = await getCrewReferrals();
  const updatedProducts = event.Records.filter((x) => x.eventName !== "REMOVE")
    .map((x) => [
      fromJS(selectKeys(unmarshall(x.dynamodb.NewImage), keysToIndex)),
      x.dynamodb.OldImage
        ? fromJS(selectKeys(unmarshall(x.dynamodb.OldImage), keysToIndex))
        : null,
    ])
    .filter(([n, o]) => !n.equals(o))
    .map(([n]) => n.toJS())
    .map(getRegistrationProjection(crewReferrals));
  if (updatedProducts.length > 0) {
    console.log({
      event: "Updating products index",
      updatedProducts: updatedProducts.map((x) => x.objectID),
    });
    await searchIndex.saveObjects(updatedProducts);
  }
}

/**
 * @param {DynamoDBStreamEvent} event
 * @returns {Promise<void>}
 */
async function indexUpdate(event) {
  const searchIndex = openAlgoliaIndex();
  await Promise.all([
    deleteRemovedItems(event, searchIndex),
    updateProductsIndex(event, searchIndex),
  ]);
}

export const handler = rollbar.lambdaHandler(indexUpdate);
