import { DynamoDBClient, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

/**
 * Create credential provider for DynamoDB client
 * @param {Env} env
 * @returns {() => {accessKeyId: string, secretAccessKey: string}}
 */
function credentialProvider(env) {
  return () => ({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY
  });
}

/**
 * Create DynamoDB client with credentials from environment
 * @param {Env} env
 * @returns {DynamoDBClient}
 */
function createDynamoDBClient(env) {
  return new DynamoDBClient({
    region: env.AWS_REGION,
    credentialDefaultProvider: credentialProvider(env)
  });
}

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
  
  const resp = await client.send(new GetItemCommand({
    TableName: tableName,
    Key: indexResp.Items[0]
  }));
  
  return resp.Item ? unmarshall(resp.Item) : null;
}

/**
 * Get registration by email, year, and slackID
 * @param {DynamoDBClient} client
 * @param {string} email
 * @param {number} year
 * @param {string} slackID
 * @returns {Promise<Object|null>}
 */
async function getRegistrationByEmail(client, email, year, slackID) {
  console.log({ event: "Loading data by registered user", email, year, slackID });
  
  const [contactResp, regResp] = await Promise.all([
    client.send(new GetItemCommand({
      TableName: "contacts",
      Key: marshall({ email, slackID })
    })),
    client.send(new GetItemCommand({
      TableName: "registrations",
      Key: marshall({ email, year: parseInt(year) })
    }))
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
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);
  
  const id = params.get("id");
  const email = params.get("email");
  const year = params.get("year");
  const slackID = params.get("slackID");
  
  console.log("Registration GET request", { id, email, year, slackID });
  
  const client = createDynamoDBClient(env);
  const tableName = env.db_table_registrations;
  
  let data = null;
  
  if (id) {
    data = await getRegistrationById(client, tableName, id);
  } else if (email && year && slackID) {
    data = await getRegistrationByEmail(client, email, parseInt(year), slackID);
  }
  
  if (!data) {
    return new Response(JSON.stringify({ error: "Data not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}