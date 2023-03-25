import { unmarshall } from "@aws-sdk/util-dynamodb";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import createSearchClient from "algoliasearch";
import { fromJS } from "immutable";

/** @typedef {import("aws-lambda").DynamoDBStreamEvent} DynamoDBStreamEvent */
/** @typedef {import("algoliasearch").SearchIndex} SearchIndex */

const crewReferrals = new Set([
]);

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
  "referral"
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
  const updatedProducts = event.Records.filter((x) => x.eventName !== "REMOVE")
    .map((x) => [
      fromJS(selectKeys(unmarshall(x.dynamodb.NewImage), keysToIndex)),
      x.dynamodb.OldImage
        ? fromJS(selectKeys(unmarshall(x.dynamodb.OldImage), keysToIndex))
        : null
    ])
    .filter(([n, o]) => !n.equals(o))
    .map(([n]) => n.toJS())
    .map(
      ({
         year,
         firstName,
         lastName,
         timestamp,
         invoiced,
         paid,
         firstTime,
         referral,
         ...rest
       }) =>
        Object.assign(rest, {
          objectID: `${year}-${rest.email}`,
          name: `${firstName} ${lastName}`,
          createdAt: new Date(timestamp).getTime(),
          _tags: [
            year.toString(),
            (!invoiced && !firstTime) || crewReferrals.has(referral)
              ? "confirmed"
              : null,
            invoiced && !paid ? "invoiced" : null,
            paid ? "paid" : null,
            firstTime && !invoiced && !crewReferrals.has(referral)
              ? "waitingList"
              : null
          ].filter(Boolean)
        })
    );
  if (updatedProducts.length > 0) {
    console.log({
      event: "Updating products index",
      updatedProducts: updatedProducts.map((x) => x.objectID)
    });
    await searchIndex.saveObjects(updatedProducts);
  }
}

/**
 * @param {DynamoDBStreamEvent} event
 * @returns {Promise<void>}
 */
async function handleIndexUpdate(event) {
  const searchIndex = openAlgoliaIndex();
  await Promise.all([
    deleteRemovedItems(event, searchIndex),
    updateProductsIndex(event, searchIndex)
  ]);
}

export const handler = handleIndexUpdate;
