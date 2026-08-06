import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { authorize, getToken } from "../../lib/auth.js";
import { createDynamoDBClient } from "../../lib/dynamodb.js";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */

/**
 * @param {DynamoDBClient} db
 * @param {String} slackID
 * @param {String} email
 * @param {Env} env
 * @returns {Promise<Record<string, any>|null>}
 */
async function getContact(db, slackID, email, env) {
  const resp = await db.send(
    new GetItemCommand({
      TableName: env.db_table_contacts,
      Key: { slackID: { S: slackID }, email: { S: email } }
    })
  );
  return resp.Item ? unmarshall(resp.Item) : null;
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

  const contact = await getContact(client, params.get("slackID"), params.get("email"), env);
  if (!contact) {
    return new Response(null, { status: 404 });
  }
  return Response.json(contact);
}
