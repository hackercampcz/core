import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { createDynamoDBClient } from "../../lib/dynamodb.js";

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const data = await request.json();
  const { email, year } = data;

  const client = createDynamoDBClient(env);

  await client.send(
    new PutItemCommand({
      TableName: env.db_table_optouts,
      Item: {
        email: { S: email },
        year: { N: year.toString() },
        timestamp: { S: new Date().toISOString() }
      }
    })
  );

  return new Response(null, { status: 202 });
}
