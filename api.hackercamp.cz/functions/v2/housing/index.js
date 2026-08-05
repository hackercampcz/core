import { liteClient } from "algoliasearch/lite";
import { createDynamoDBClient, getItemsFromDB } from "../lib/dynamodb.js";
import { authorize, getToken } from "../lib/auth.js";

async function getAttendees(db, env, year) {
  const client = liteClient(env.algolia_app_id, env.algolia_search_key);
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

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  console.log({ method: "GET", params: Object.fromEntries(params) });

  const token = getToken(request.headers);
  const isAuthorized = await authorize("admin", token, env.HC_JWT_SECRET);
  if (!isAuthorized) {
    return new Response(null, { status: 401 });
  }

  const client = createDynamoDBClient(env);
  const year = parseInt(params.get("year") ?? "2022", 10);

  const data = await getAttendees(client, env, year);
  return Response.json(data);
}
