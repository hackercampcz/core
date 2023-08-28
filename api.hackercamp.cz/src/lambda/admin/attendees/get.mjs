import {
  BatchGetItemCommand,
  DynamoDBClient,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { partition } from "@thi.ng/transducers";
import createSearchClient from "algoliasearch";
import { response, notFound, getHeader } from "../../http.mjs";
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
  console.log("GET ITEMS FROM DB", hits);
  for (const batch of partition(100, true, hits)) {
    console.log("batch", batch);
    const keys = batch.map(({ year, slackID }) => ({
      year: { N: year.toString() },
      slackID: { S: slackID },
    }));
    console.log(keys);
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

async function getAttendees(year) {
  console.log("Loading attendees", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_attendees,
      Select: "ALL_ATTRIBUTES",
      FilterExpression: "#yr = :yr",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        { ":yr": year },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getHackerAttendees(year) {
  console.log("Loading attendees", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_attendees,
      Select: "ALL_ATTRIBUTES",
      FilterExpression:
        "#yr = :yr AND NOT (ticketType IN (:crew, :staff, :volunteer))",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        {
          ":yr": year,
          ":crew": "crew",
          ":staff": "staff",
          ":volunteer": "volunteer",
        },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getCrewAttendees(year) {
  console.log("Loading attendees", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_attendees,
      FilterExpression: "#yr = :yr AND ticketType = :crew",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        {
          ":yr": year,
          ":crew": "crew",
        },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getStaffAttendees(year) {
  console.log("Loading attendees", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_attendees,
      FilterExpression: "#yr = :yr AND ticketType = :staff",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        {
          ":yr": year,
          ":staff": "staff",
        },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getVolunteerAttendees(year) {
  console.log("Loading attendees", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_attendees,
      FilterExpression: "#yr = :yr AND ticketType = :volunteer",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        {
          ":yr": year,
          ":volunteer": "volunteer",
        },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

function getData(type, year) {
  // const { algolia_app_id, algolia_search_key, algolia_index_name } =
  //   process.env;
  // const client = createSearchClient(algolia_app_id, algolia_search_key);
  switch (type) {
    case "attendees":
      return getAttendees(year);
    case "crewAttendees":
      return getCrewAttendees(year);
    case "staffAttendees":
      return getStaffAttendees(year);
    case "volunteerAttendees":
      return getVolunteerAttendees(year);
    case "hackerAttendees":
      return getHackerAttendees(year);
    default:
      throw new Error(`Unknown type ${type}`);
  }
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
