import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import createSearchClient from "algoliasearch";
import { getItemsFromDB } from "../attendees.js";
import { notFound, response } from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});

/**
 * @param {DynamoDBClient} dynamo
 * @param {number} year
 * @returns {Promise<*>}
 */
async function getAttendees(dynamo, year) {
  const { algolia_app_id, algolia_search_key, algolia_index_name } = process.env;
  const client = createSearchClient(algolia_app_id, algolia_search_key);
  const index = client.initIndex(algolia_index_name);
  const { hits } = await index.search("", {
    attributesToRetrieve: ["year", "slackID"],
    tagFilters: [year.toString()],
    hitsPerPage: 500,
  });

  const items = await getItemsFromDB(dynamo, process.env.db_table_attendees, hits, {
    ProjectionExpression: "slackID, #name, company, housing, housingPlacement",
    ExpressionAttributeNames: { "#name": "name" },
  });
  return items.map((x) => Object.assign({ isEditable: true }, x));
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const params = Object.assign({ year: "2022" }, event.queryStringParameters);
  console.log({ method: "GET", params });
  const data = await getAttendees(dynamo, parseInt(params.year, 10));
  if (!data.length) return notFound();
  return response(data);
}
