import {
  BatchGetItemCommand,
  DynamoDBClient,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import createSearchClient from "algoliasearch";
import { response, internalError, notFound } from "../../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */
/** @typedef { import("algoliasearch").SearchIndex } SearchIndex */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

/**
 * @returns {SearchIndex}
 */
function openAlgoliaIndex() {
  const { algolia_app_id, algolia_search_key, algolia_index_name } =
    process.env;
  const client = createSearchClient(algolia_app_id, algolia_search_key);
  return client.initIndex(algolia_index_name);
}

async function getOptOuts(year) {
  console.log("Loading opt-outs");
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_optouts,
      ProjectionExpression: "email",
      FilterExpression: "#yr = :yr",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall({ ":yr": year }),
    })
  );
  return new Set(res.Items.map((x) => x.email.S));
}

/**
 *
 * @param {DynamoDBClient} db
 * @param hits
 * @returns {Promise<*|*[]>}
 */
async function getItemsFromDB(db, hits) {
  if (hits.length === 0) return [];
  const tableName = process.env.db_table_registrations;
  const keys = hits.map(({ year, email }) => ({
    year: { N: year.toString() },
    email: { S: email },
  }));
  const result = await db.send(
    new BatchGetItemCommand({
      RequestItems: { [tableName]: { Keys: keys } },
    })
  );
  return result.Responses[tableName]
    .map((x) => unmarshall(x))
    .sort((a, b) => -1 * a.timestamp?.localeCompare(b.timestamp));
}

/**
 *
 * @param {SearchIndex} index
 * @param {number} year
 * @param {number} page
 * @returns {Promise<Record<string, any>[]>}
 */
async function getConfirmedRegistrations(index, year, page) {
  console.log("Loading confirmed hackers data", { year, page });
  const { hits, ...searchResult } = await index.search("", {
    attributesToRetrieve: ["year", "email"],
    tagFilters: [year.toString(), "confirmed"],
    // TODO: make page size reasonably small
    hitsPerPage: 300,
    page
  });
  // searchResult: {
  //     nbHits: 40,
  //     page: 0,
  //     nbPages: 2,
  //     hitsPerPage: 20,
  //     exhaustiveNbHits: true,
  //     exhaustiveTypo: true,
  //     exhaustive: { nbHits: true, typo: true },
  //     query: '',
  //     params: 'tagFilters=%5B%222023%22%2C%22confirmed%22%5D',
  //     renderingContent: {},
  //     processingTimeMS: 1,
  //     processingTimingsMS: { getIdx: [Object], request: [Object], total: 1 },
  //     serverTimeMS: 2
  //   }
  const res = await getItemsFromDB(db, hits);
  // TODO: pagination
  return res;
}

async function getHackersRegistrations(year) {
  console.log("Loading hackers data", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_registrations,
      Select: "ALL_ATTRIBUTES",
      FilterExpression: "#yr = :yr AND attribute_not_exists(invoiced)",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        { ":yr": year },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getWaitingListRegistrations(year) {
  console.log("Loading waiting list data", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_registrations,
      Select: "ALL_ATTRIBUTES",
      FilterExpression:
        "#yr = :yr AND firstTime = :true AND attribute_not_exists(invoiced) AND (attribute_not_exists(referral) OR attribute_type(referral, :null))",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        { ":true": true, ":null": "NULL", ":yr": year },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getInvoicedRegistrations(year) {
  console.log("Loading invoiced registrations", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_registrations,
      Select: "ALL_ATTRIBUTES",
      FilterExpression:
        "#yr = :yr AND attribute_exists(invoiced) AND attribute_not_exists(paid)",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        { ":yr": year },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getPaidRegistrations(year) {
  console.log("Loading paid registrations", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_registrations,
      Select: "ALL_ATTRIBUTES",
      FilterExpression: "#yr = :yr AND attribute_exists(paid)",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        { ":yr": year },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

function getData(type, year, page) {
  const index = openAlgoliaIndex();
  switch (type) {
    case "confirmed":
      return getConfirmedRegistrations(index, year, page);
    case "hackers":
      return getHackersRegistrations(year);
    case "invoiced":
      return getInvoicedRegistrations(year);
    case "paid":
      return getPaidRegistrations(year);
    case "waitingList":
      return getWaitingListRegistrations(year);
    case "optouts":
      return null;
    default:
      throw new Error(`Unknown type ${type}`);
  }
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  console.log("QS", event.queryStringParameters);
  const { type, year, page } = Object.assign(
    { year: "2022", page: "0" },
    event.queryStringParameters
  );
  try {
    const [optouts, data] = await Promise.all([
      getOptOuts(parseInt(year)),
      getData(type, parseInt(year), parseInt(page)),
    ]);
    if (type === "optouts") return response(Array.from(optouts));
    if (!data) return notFound();
    return response(data.filter((x) => !optouts.has(x.email)));
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
