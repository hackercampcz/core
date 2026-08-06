import { PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { liteClient } from "algoliasearch/lite";
import { resultsCount } from "../../lib/algolia.js";
import { acceptsCSV, csv } from "../../lib/csv.js";
import { createDynamoDBClient, getItemsFromDB } from "../../lib/dynamodb.js";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */

/**
 * @param {Env} env
 * @param {DynamoDBClient} db
 * @param {string} query
 * @param {string} tag
 * @param {Number} year
 * @param {Number} page
 * @param {Number} pageSize
 * @param {Object} options
 * @param {Boolean} options.allYears
 * @returns {Promise<{items: Array<Record<string, *>>, page: *, pages: *, total: *, counts: {all: *, hacker: *, volunteer: *, staff: *, crew: *}}>}
 */
async function getAttendees(env, db, query, tag, year, page, pageSize, { allYears }) {
  const { algolia_app_id, algolia_search_key, algolia_index_name } = env;
  const client = liteClient(algolia_app_id, algolia_search_key);

  console.log({ event: "Loading Attendees", tag, year, page, pageSize, query, allYears });

  const { results } = await client.search({
    requests: [
      {
        query,
        indexName: algolia_index_name,
        attributesToRetrieve: ["year", "slackID"],
        tagFilters: [
          allYears ? null : year.toString(),
          tag === "searchAttendees" || tag === "attendees" ? null : tag.replace("Attendees", "")
        ].filter(Boolean),
        hitsPerPage: pageSize,
        page
      },
      resultsCount(algolia_index_name, year, null),
      resultsCount(algolia_index_name, year, "hacker"),
      resultsCount(algolia_index_name, year, "volunteer"),
      resultsCount(algolia_index_name, year, "staff"),
      resultsCount(algolia_index_name, year, "crew")
    ]
  });

  const [{ hits, nbHits, nbPages }, ...counts] = results;
  const [all, hacker, volunteer, staff, crew] = counts.map(x => x.nbHits);

  const tableName = env.db_table_attendees;
  const items = await getItemsFromDB(db, tableName, hits);

  return { items, page, pages: nbPages, total: nbHits, counts: { all, hacker, volunteer, staff, crew } };
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
  const year = Number.parseInt(params.get("year") ?? env.year ?? "2022");
  const query = params.get("query") ?? "";
  const page = Number.parseInt(params.get("page") ?? "0");
  const pageSize = Number.parseInt(params.get("pageSize") ?? "20");
  const type = params.get("type");

  const respData = await getAttendees(env, client, query, type, year, page, pageSize, {
    allYears: acceptsCSV(request) && !params.has("year")
  });
  if (acceptsCSV(request)) {
    return await csv(respData, { year, resource: "attendees", type });
  }
  return Response.json(respData);
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {*} data
 */
function editAttendee(db, env, data) {
  console.log({ event: "Update attendee", data });
  return db.send(
    new UpdateItemCommand({
      TableName: env.db_table_attendees,
      Key: { year: { N: data.year.toString() }, slackID: { S: data.slackID } },
      UpdateExpression:
        "SET #name = :name, email = :email, ticketType = :ticketType, note = :note, company = :company, housingPlacement = :housingPlacement, edited = :now, editedBy = :editedBy",
      ExpressionAttributeValues: marshall({
        ":name": data.name,
        ":email": data.email,
        ":note": data.note,
        ":company": data.company,
        ":housingPlacement": data.housingPlacement,
        ":now": new Date().toISOString(),
        ":editedBy": data.editedBy,
        ":ticketType": data.ticketType
      }, { removeUndefinedValues: true, convertEmptyValues: true }),
      ExpressionAttributeNames: { "#name": "name" }
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {*} data
 */
function addAttendee(db, env, data) {
  const id = `hc-${crypto.randomUUID()}`;
  const attendee = Object.assign({}, data, {
    year: parseInt(data.year, 10),
    slackID: data.slackID || id,
    slug: data.slackID || id
  });
  console.log({ event: "Put attendee", attendee });

  return db.send(
    new PutItemCommand({
      TableName: env.db_table_attendees,
      Item: marshall(attendee, { convertEmptyValues: true, removeUndefinedValues: true })
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {*} data
 */
async function checkIn(db, env, data) {
  console.log({ event: "Attendee check-in", data });
  return db.send(
    new UpdateItemCommand({
      TableName: env.db_table_attendees,
      Key: { year: { N: data.year.toString() }, slackID: { S: data.slackID } },
      UpdateExpression:
        "SET checkIn = :checkIn, checkInBy = :checkInBy, checkInNote = :checkInNote, nfcTronData = :nfcTronData",
      ExpressionAttributeValues: marshall({
        ":checkIn": new Date().toISOString(),
        ":checkInBy": data.admin,
        ":checkInNote": data.note,
        ":nfcTronData": data.nfcTronData
      }, { removeUndefinedValues: true, convertEmptyValues: true })
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {*} data
 */
async function checkOut(db, env, data) {
  console.log({ event: "Attendee check-out", data });
  return db.send(
    new UpdateItemCommand({
      TableName: env.db_table_attendees,
      Key: { year: { N: data.year.toString() }, slackID: { S: data.slackID } },
      UpdateExpression:
        "SET checkout = :checkOut, checkOutBy = :checkOutBy, checkOutNote = :checkOutNote, checkOutPaid = :checkOutPaid, checkOutTotal = :checkOutTotal",
      ExpressionAttributeValues: marshall({
        ":checkOut": new Date().toISOString(),
        ":checkOutBy": data.admin,
        ":checkOutNote": data.note,
        ":checkOutPaid": data.paid,
        ":checkOutTotal": data.amount
      }, { removeUndefinedValues: true, convertEmptyValues: true })
    })
  );
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const data = await request.json();
  const client = createDynamoDBClient(env);

  console.log({ method: "POST", data });

  switch (data.command) {
    case "edit":
      await editAttendee(client, env, data.params);
      break;

    case "add":
      await addAttendee(client, env, data.params);
      break;

    case "checkIn":
      await checkIn(client, env, data.params);
      break;

    case "checkOut":
      await checkOut(client, env, data.params);
      break;
  }

  if (request.headers.get("Accept") === "application/json") {
    return new Response(null, { status: 202 });
  }
  return new Response(null, {
    status: 303,
    headers: { Location: request.headers.get("Referer") }
  });
}
