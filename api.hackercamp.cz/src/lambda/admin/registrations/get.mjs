import {
  BatchGetItemCommand,
  DynamoDBClient,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import csv from "@fast-csv/format";
import { partition } from "@thi.ng/transducers";
import createSearchClient from "algoliasearch";
import { getHeader, response } from "../../http.mjs";
import { resultsCount } from "../../algolia.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

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
 * @returns {Promise<Record<string, any>[]>}
 */
async function getItemsFromDB(db, hits) {
  if (hits.length === 0) return [];
  const tableName = process.env.db_table_registrations;
  const result = [];
  for (const batch of partition(100, true, hits)) {
    const keys = batch.map(({ year, email }) => ({
      year: { N: year.toString() },
      email: { S: email },
    }));
    const items = await db.send(
      new BatchGetItemCommand({
        RequestItems: { [tableName]: { Keys: keys } },
      })
    );
    result.push(
      ...items.Responses[tableName]
        .map((x) => unmarshall(x))
        .sort((a, b) => -1 * a.timestamp?.localeCompare(b.timestamp))
    );
  }
  return result;
}

/**
 *
 * @param {string} query
 * @param {string} tag
 * @param {number} year
 * @param {number} page
 * @param {number} pageSize
 */
async function getRegistrations(query, tag, year, page, pageSize) {
  const { algolia_app_id, algolia_search_key, algolia_index_name } =
    process.env;
  const client = createSearchClient(algolia_app_id, algolia_search_key);

  console.log({ event: "Loading registrations", year, page, pageSize, query });

  const { results } = await client.multipleQueries([
    {
      query,
      indexName: algolia_index_name,
      params: {
        attributesToRetrieve: ["year", "email"],
        tagFilters: [year.toString(), tag],
        hitsPerPage: pageSize,
        page,
      },
    },
    resultsCount(algolia_index_name, year, "paid"),
    resultsCount(algolia_index_name, year, "invoiced"),
    resultsCount(algolia_index_name, year, "confirmed"),
    resultsCount(algolia_index_name, year, "waitingList"),
    resultsCount(algolia_index_name, year, "volunteer"),
    resultsCount(algolia_index_name, year, "staff"),
  ]);

  const [{ hits, nbHits, nbPages }, ...counts] = results;
  const [paid, invoiced, confirmed, waitingList, volunteers, staff] = counts.map(
    (x) => x.nbHits
  );

  const items = await getItemsFromDB(db, hits);
  return {
    items,
    page,
    pages: nbPages,
    total: nbHits,
    counts: { paid, invoiced, confirmed, waitingList, volunteers, staff },
  };
}

function getAllHeaders(data) {
  const headers = new Set();
  for (const item of data.items) {
    for (const key of Object.keys(item)) {
      headers.add(key);
    }
  }
  return Array.from(headers);
}

async function formatResponse(data, { year, type, format }) {
  if (format === "csv" || format === "text/csv") {
    console.log({ event: "Formatting CSV" });
    const headers = getAllHeaders(data);
    const text = await csv.writeToString(data.items, { headers });
    const fileName = `hc-${year}-registrations-${type}.csv`;
    return response(text, {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=${fileName}`,
    });
  }
  return response(data);
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  console.log({ queryString: event.queryStringParameters });
  const { type, year, page, pageSize, format, query } = Object.assign(
    {
      year: "2022",
      query: "",
      page: "0",
      pageSize: "20",
      format: getHeader(event.headers, "Accept"),
    },
    event.queryStringParameters
  );

  if (type === "optouts") {
    const optouts = await getOptOuts(parseInt(year));
    return formatResponse(optouts, { year, type, format });
  }

  const data = await getRegistrations(
    query,
    type === "volunteers" ? "volunteer" : type,
    parseInt(year),
    parseInt(page),
    parseInt(pageSize)
  );
  return formatResponse(data, { year, type, format });
}
