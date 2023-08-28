import { BatchGetItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { partition } from "@thi.ng/transducers";
import createSearchClient from "algoliasearch";
import { getHeader } from "../../http.mjs";
import { formatResponse } from "../csv.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

async function getAttendeesSearch(query, tag, year, page, pageSize) {
  const { algolia_app_id, algolia_search_key } = process.env;
  const client = createSearchClient(algolia_app_id, algolia_search_key);

  console.log({
    event: "Loading Attendees",
    tag,
    year,
    page,
    pageSize,
    query,
  });

  const { results } = await client.multipleQueries([
    {
      query,
      indexName: "hc-attendees",
      params: {
        attributesToRetrieve: ["year", "slackID"],
        tagFilters: [
          year.toString(),
          tag === "searchAttendees" || tag === "attendees"
            ? null
            : tag.replace("Attendees", ""),
        ].filter(Boolean),
        hitsPerPage: pageSize,
        page,
      },
    },
    // resultsCount(algolia_index_name, year, "paid"),
    // resultsCount(algolia_index_name, year, "invoiced"),
    // resultsCount(algolia_index_name, year, "confirmed"),
    // resultsCount(algolia_index_name, year, "waitingList"),
    // resultsCount(algolia_index_name, year, "volunteer"),
    // resultsCount(algolia_index_name, year, "staff"),
  ]);

  const [{ hits, nbHits, nbPages }] = results;
  // const [paid, invoiced, confirmed, waitingList, volunteer, staff] = counts.map(
  //   (x) => x.nbHits
  // );
  console.log(hits, nbHits, nbPages);

  const items = await getItemsFromDB(db, hits);
  console.log(items);
  return {
    items,
    page,
    pages: nbPages,
    total: nbHits,
    counts: {},
  };
}

/**
 *
 * @param {DynamoDBClient} db
 * @param hits
 * @returns {Promise<Record<string, any>[]>}
 */
async function getItemsFromDB(db, hits) {
  if (hits.length === 0) return [];
  const tableName = process.env.db_table_attendees;
  const result = [];
  for (const batch of partition(100, true, hits)) {
    const keys = batch.map(({ year, slackID }) => ({
      year: { N: year.toString() },
      slackID: { S: slackID },
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

  const respData = await getAttendeesSearch(
    query,
    type,
    parseInt(year),
    parseInt(page),
    parseInt(pageSize)
  );
  return formatResponse(respData, { year, type, format });
}
