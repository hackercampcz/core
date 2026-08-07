import { createAlgoliaClient } from "#lib/algolia.js";
import { createDynamoDBClient, getItemsFromDB } from "#lib/dynamodb.js";
import { GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

/**
 * Get all attendees for a specific year using Algolia search
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {number} year
 * @returns {Promise<Array<Record<string, any>>>}
 */
async function getAttendees(db, env, year) {
  const client = createAlgoliaClient(env);
  const { results: [{ hits = [] } = {}] = {} } = await client.search({
    requests: [{
      indexName: env.algolia_attendees_index,
      query: "",
      attributesToRetrieve: ["year", "slackID"],
      tagFilters: [year.toString(), "-staff"],
      hitsPerPage: 500
    }]
  });

  return getItemsFromDB(db, env.db_table_attendees, hits, {
    ProjectionExpression: "slackID, #name, company, events, image, travel, ticketType, slug",
    ExpressionAttributeNames: { "#name": "name" }
  });
}

/**
 * Get a single attendee by slackID and year
 * @param {DynamoDBClient} db
 * @param {string} tableName
 * @param {string} slackID
 * @param {number} year
 * @returns {Promise<Record<string, any>|null>}
 */
async function getAttendee(db, tableName, slackID, year) {
  const result = await db.send(
    new GetItemCommand({
      TableName: tableName,
      Key: {
        slackID: { S: slackID },
        year: { N: year.toString() }
      }
    })
  );
  return result.Item ? unmarshall(result.Item) : null;
}

/**
 * Get attendees by email using the by-email GSI
 * @param {DynamoDBClient} db
 * @param {string} tableName
 * @param {string} email
 * @returns {Promise<Array<Record<string, any>>>}
 */
async function getAttendeeByEmail(db, tableName, email) {
  const result = await db.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: `${tableName}-by-email`,
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: { ":email": { S: email } }
    })
  );
  return result.Items;
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  const year = parseInt(params.get("year") ?? env.year ?? "2022", 10);

  console.log({ method: "GET", params: Object.fromEntries(params), year });

  const client = createDynamoDBClient(env);
  const tableName = env.db_table_attendees;

  if (params.has("slackID")) {
    return Response.json(await getAttendee(client, tableName, params.get("slackID"), year));
  }

  if (params.has("email")) {
    return Response.json(await getAttendeeByEmail(client, tableName, params.get("email")));
  }

  return Response.json(await getAttendees(client, env, year));
}
