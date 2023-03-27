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
  return res.Items.map((x) => x.email.S);
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
    year: { N: `${year}` },
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

/**
 *
 * @param {SearchIndex} index
 * @param {string} tag
 * @param {number} year
 * @param {number} page
 * @returns {Promise<Record<string, any>[]>}
 */
async function getRegistrations(index, tag, year, page) {
  console.log(`Loading ${tag} registrations`, { year, page });
  const { hits, ...searchResult } = await index.search("", {
    attributesToRetrieve: ["year", "email"],
    tagFilters: [year.toString(), tag],
    // TODO: make page size reasonably small
    hitsPerPage: 300,
    page,
  });

  const items = await getItemsFromDB(db, hits);
  return {
    items,
    page,
    pages: searchResult.nbPages,
    total: searchResult.nbHits,
  };
}

/**
 * @param {string} type
 * @param {number} year
 * @param {number} page
 */
function getData(type, year, page) {
  const index = openAlgoliaIndex();
  return getRegistrations(index, type, year, page);
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
    if (type === "optouts") {
      const optouts = await getOptOuts(year);
      return response(optouts);
    }
    const data = await getData(type, parseInt(year), parseInt(page));
    if (!data.total) return notFound();
    return response(data.items);
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
