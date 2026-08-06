import { liteClient } from "algoliasearch/lite";
import { createDynamoDBClient, getItemsFromDB } from "../../lib/dynamodb.js";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */

/**
 * @param {Number} year
 * @param {Env} env
 * @param {DynamoDBClient} dynamo
 * @returns {Promise<Array<Record<string, *>>>}
 */
async function getHousing(year, env, dynamo) {
  console.log("Loading housing", { year });
  const { algolia_app_id, algolia_search_key, algolia_index_name } = env;
  const client = liteClient(algolia_app_id, algolia_search_key);
  const { results: [{ hits }] } = await client.search({
    requests: [{
      indexName: algolia_index_name,
      query: "",
      attributesToRetrieve: ["year", "slackID"],
      tagFilters: [year.toString()],
      hitsPerPage: 500
    }]
  });
  return getItemsFromDB(dynamo, env.db_table_attendees, hits, {
    ProjectionExpression: "slackID, #name, company, housing, housingPlacement, ticketType, #email, #phone",
    ExpressionAttributeNames: { "#name": "name", "#email": "email", "#phone": "phone" }
  });
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  console.log({ method: "GET", params: Object.fromEntries(params) });

  const client = createDynamoDBClient(env);
  const year = parseInt(params.get("year") ?? env.year ?? "2022", 10);
  const data = await getHousing(year, env, client);

  return Response.json(data);
}
