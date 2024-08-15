import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { liteClient } from "algoliasearch/lite";
import { getItemsFromDB } from "../../attendees.js";
import { notFound, response } from "../../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const dynamo = new DynamoDBClient({});

async function getHousing(year) {
  console.log("Loading housing", { year });
  const { algolia_app_id, algolia_search_key, algolia_index_name } = process.env;
  const client = liteClient(algolia_app_id, algolia_search_key);
  const { results: [{ hits }] } = await client.search({
    requests: [{
      indexName: algolia_index_name,
      query: "",
      attributesToRetrieve: ["year", "slackID"],
      tagFilters: [year.toString()],
      hitsPerPage: 500,
    }],
  });
  return getItemsFromDB(dynamo, process.env.db_table_attendees, hits, {
    ProjectionExpression: "slackID, #name, company, housing, housingPlacement, ticketType",
    ExpressionAttributeNames: { "#name": "name" },
  });
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  console.log("QS", event.queryStringParameters);
  const { year } = Object.assign(
    { year: process.env.year ?? "2022" },
    event.queryStringParameters,
  );
  const data = await getHousing(parseInt(year));
  if (!data) return notFound();
  return response(data);
}
