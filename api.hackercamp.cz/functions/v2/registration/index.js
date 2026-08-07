import { createDynamoDBClient } from "#lib/dynamodb.js";
import { GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */

/**
 * Get registration by ID using the by-id GSI
 * @param {DynamoDBClient} client
 * @param {string} tableName
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getRegistrationById(client, tableName, id) {
  console.log({ event: "Loading data by id", id });

  const indexResp = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: `${tableName}-by-id`,
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: { ":id": { S: id } },
      ExpressionAttributeNames: { "#year": "year" },
      ProjectionExpression: "#year, email"
    })
  );

  if (!indexResp.Items || !indexResp.Items.length) {
    console.log({ event: "Registration not found", id });
    return null;
  }

  const resp = await client.send(
    new GetItemCommand({
      TableName: tableName,
      Key: indexResp.Items[0]
    })
  );

  return resp.Item ? unmarshall(resp.Item) : null;
}

/**
 * Get registration by email, year, and slackID
 * @param {DynamoDBClient} client
 * @param {string} email
 * @param {number} year
 * @param {string} slackID
 * @param {Env} env
 * @returns {Promise<Object|null>}
 */
async function getRegistrationByEmail(client, email, year, slackID, env) {
  console.log({ event: "Loading data by registered user", email, year, slackID });

  const [contactResp, regResp] = await Promise.all([
    client.send(
      new GetItemCommand({
        TableName: env.db_table_contacts,
        Key: { email: { S: email }, slackID: { S: slackID } }
      })
    ),
    client.send(
      new GetItemCommand({
        TableName: env.db_table_registrations,
        Key: { email: { S: email }, year: { N: year.toString() } }
      })
    )
  ]);

  if (regResp.Item) {
    console.log({ event: "Got registration", registration: regResp.Item });
    return unmarshall(regResp.Item);
  }

  if (contactResp.Item) {
    console.log({ event: "Got contact", contact: contactResp.Item });
    const contact = unmarshall(contactResp.Item);
    const [firstName, lastName] = contact.name?.split(" ") || [contact.name || "", ""];
    return {
      firstName,
      lastName,
      email: contact.email,
      company: contact.company,
      invRegNo: contact.companyID,
      invVatNo: contact.vatID,
      invAddress: contact.address,
      invEmail: contact.invoiceEmail || contact.email,
      invName: contact.company || contact.name
    };
  }

  console.log({ event: "Nothing found", email, year, slackID });
  return null;
}

/**
 * @param {URLSearchParams} params
 * @param {DynamoDBClient} client
 * @param {Env} env
 * @returns {Promise<Object|null>}
 */
async function getData(params, client, env) {
  const id = params.get("id");
  const email = params.get("email");
  const year = params.get("year");
  const slackID = params.get("slackID");

  if (id) {
    return getRegistrationById(client, env.db_table_registrations, id);
  } else if (email && year && slackID) {
    return getRegistrationByEmail(client, email, parseInt(year), slackID, env);
  }
  return null;
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  console.log("Registration GET request", Object.fromEntries(params));

  const client = createDynamoDBClient(env);
  const data = await getData(params, client, env);

  if (!data) {
    return new Response(JSON.stringify({ error: "Data not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  return Response.json(data);
}

/**
 * @param {DynamoDBClient} client
 * @param {String} tableName
 * @param {String} email
 * @param {Number} year
 * @returns {Promise<Record<string, any>|null>}
 */
async function getRegistrationByEmailOnly(client, tableName, email, year) {
  const resp = await client.send(
    new GetItemCommand({
      TableName: tableName,
      Key: { email: { S: email }, year: { N: year.toString() } }
    })
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const data = await request.json();
  let { email, year, firstTime, ...rest } = data;

  const client = createDynamoDBClient(env);
  const tableName = env.db_table_registrations;

  const existingReg = await getRegistrationByEmailOnly(client, tableName, email, year);
  if (existingReg && !rest.id) {
    return new Response("E-mail is already registered.", { status: 409 });
  }

  const isNewbee = firstTime === "1";
  email = email.trim().toLowerCase();
  year = parseInt(year, 10);
  rest = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v?.trim()]).filter(([, v]) => Boolean(v)));
  const isVolunteer = rest.ticketType === "volunteer";
  const isHacker = rest.ticketType === "hacker";
  const isPatron = rest.ticketType === "hacker-patron";

  if (
    (isPatron && rest.volunteerArrivalDay === "th")
    || (isVolunteer && rest.company === "google")
  ) {
    return new Response("fok off", { status: 451 });
  }

  const id = rest.id || crypto.randomUUID();
  console.log({ event: "Put registration", email, year, isNewbee, isVolunteer, ...rest });

  await client.send(
    new PutItemCommand({
      TableName: env.db_table_registrations,
      Item: marshall({
        email,
        year,
        firstTime: isNewbee,
        ...rest,
        id,
        timestamp: new Date().toISOString()
      }, { convertEmptyValues: true, removeUndefinedValues: true, convertClassInstanceToMap: true })
    })
  );

  return new Response(null, { status: 202 });
}
