import { createAlgoliaClient } from "#lib/algolia.js";
import { createDynamoDBClient, getItemsFromDB } from "#lib/dynamodb.js";
import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {Number} year
 * @returns {Promise<({isEditable: boolean} & Record<string, *>)[]>}
 */
async function getAttendees(db, env, year) {
  const client = createAlgoliaClient(env);
  const { results: [{ hits }] } = await client.search({
    requests: [{
      indexName: env.algolia_index_name,
      query: "",
      attributesToRetrieve: ["year", "slackID"],
      tagFilters: [year.toString()],
      hitsPerPage: 500
    }]
  });

  const items = await getItemsFromDB(db, env.db_table_attendees, hits, {
    ProjectionExpression: "slackID, #name, company, housing, housingPlacement",
    ExpressionAttributeNames: { "#name": "name" }
  });
  return items.map(x => Object.assign({ isEditable: true }, x));
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

  const data = await getAttendees(client, env, year);
  return Response.json(data);
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const data = await request.json();
  const year = parseInt(data.year, 10);

  console.log({ method: "POST", data });

  const client = createDynamoDBClient(env);

  for (const item of data.items) {
    await client.send(
      new UpdateItemCommand({
        TableName: env.db_table_attendees,
        Key: { slackID: { S: item.slackID }, year: { N: year.toString() } },
        UpdateExpression: "SET housing = :housing, housingPlacement = :housingPlacement",
        ExpressionAttributeValues: marshall({
          ":housing": item.housing,
          ":housingPlacement": item.housingPlacement
        }, { removeUndefinedValues: true })
      })
    );
  }

  return new Response(null, { status: 202 });
}
