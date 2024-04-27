import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import createSearchClient from "algoliasearch";
import { getItemsFromDB } from "../attendees.js";
import { errorResponse, getHeader, response, withCORS } from "../http.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});
const rollbar = Rollbar.init({ lambdaName: "attendees" });

async function getAttendees(dynamo, year) {
  const { algolia_app_id, algolia_search_key, algolia_index_name } = process.env;
  const client = createSearchClient(algolia_app_id, algolia_search_key);
  const index = client.initIndex(algolia_index_name);
  const { hits } = await index.search("", {
    attributesToRetrieve: ["year", "slackID"],
    tagFilters: [year.toString()],
    hitsPerPage: 500,
  });

  return getItemsFromDB(dynamo, process.env.db_table_attendees, hits, {
    ProjectionExpression: "slackID, #name, company, events, image, travel, ticketType, slug",
    ExpressionAttributeNames: { "#name": "name" },
  });
}

async function getAttendee(dynamo, slackID, year) {
  const result = await dynamo.send(
    new GetItemCommand({
      TableName: process.env.db_table_attendees,
      Key: marshall({ slackID, year }),
    }),
  );
  return result.Item ? unmarshall(result.Item) : null;
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function attendees(event) {
  rollbar.configure({ payload: { event } });
  const withCORS_ = withCORS(
    ["GET", "POST", "OPTIONS"],
    getHeader(event?.headers, "Origin") ?? "*",
  );
  if (event.httpMethod === "OPTIONS") {
    return withCORS_({
      statusCode: 204,
      body: "",
    });
  }
  try {
    const params = Object.assign({ year: "2022" }, event.queryStringParameters);
    console.log({ method: "GET", params });
    const year = parseInt(params.year, 10);
    if (params.slackID) {
      const attendee = await getAttendee(dynamo, params.slackID, year);
      return withCORS_(response(attendee));
    }
    const attendees = await getAttendees(dynamo, year);
    return withCORS_(response(attendees));
  } catch (err) {
    rollbar.error(err);
    return withCORS_(errorResponse(err));
  }
}

export const handler = rollbar.lambdaHandler(attendees);
