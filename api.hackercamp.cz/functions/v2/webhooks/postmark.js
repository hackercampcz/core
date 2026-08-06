import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { createDynamoDBClient } from "../../lib/dynamodb.js";

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const client = createDynamoDBClient(env);
  const { token } = new URL(request.url).searchParams;

  if (token !== env.postmark_webhook_token) {
    return new Response(null, { status: 401 });
  }

  const payload = await request.json();
  await client.send(
    new PutItemCommand({
      TableName: env.db_table_postmark,
      Item: marshall(payload)
    })
  );

  return Response.json({ status: "ok" });
}
