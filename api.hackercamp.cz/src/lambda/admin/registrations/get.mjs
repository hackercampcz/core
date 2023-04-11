import {
  BatchGetItemCommand,
  DynamoDBClient,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import csv from "@fast-csv/format";
import createSearchClient from "algoliasearch";
import { response } from "../../http.mjs";
import { resultsCount } from "../../algolia.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

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

/**
 *
 * @param {string} tag
 * @param {number} year
 * @param {number} page
 */
async function getRegistrations(tag, year, page) {
  const { algolia_app_id, algolia_search_key, algolia_index_name } =
    process.env;
  const client = createSearchClient(algolia_app_id, algolia_search_key);

  console.log(`Loading ${tag} registrations`, { year, page });
  const { results } = await client.multipleQueries([
    {
      indexName: algolia_index_name,
      query: "",
      params: {
        attributesToRetrieve: ["year", "email"],
        tagFilters: [year.toString(), tag],
        // TODO: make page size reasonably small
        hitsPerPage: 20,
        page,
      },
    },
    resultsCount(algolia_index_name, year, "paid"),
    resultsCount(algolia_index_name, year, "invoiced"),
    resultsCount(algolia_index_name, year, "confirmed"),
    resultsCount(algolia_index_name, year, "waitingList"),
  ]);

  const [{ hits, ...searchResult }, ...counts] = results;
  const [paid, invoiced, confirmed, waitingList] = counts.map((x) => x.nbHits);

  const items = await getItemsFromDB(db, hits);
  return {
    items,
    page,
    pages: searchResult.nbPages,
    total: searchResult.nbHits,
    counts: { paid, invoiced, confirmed, waitingList },
  };
}

async function formatResponse(data, { year, type, format }) {
  if (format === "csv") {
    console.log({ event: "Formatting CSV" });
    const text = await csv.writeToString(data.items, { headers: true });
    return response(text, {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=hc-${year}-registrations-${type}.csv`,
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
  const { type, year, page, format } = Object.assign(
    { year: "2022", page: "0" },
    event.queryStringParameters
  );

  // TODO: infer `format` from "Accept-Type" header
  // TODO: For CSV export get all items, not just one page

  if (type === "optouts") {
    const optouts = await getOptOuts(parseInt(year));
    return formatResponse(optouts, { year, type, format });
  }

  const data = await getRegistrations(type, parseInt(year), parseInt(page));
  return formatResponse(data, { year, type, format });
}
