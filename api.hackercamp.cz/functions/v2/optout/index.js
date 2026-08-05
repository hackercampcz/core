import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { createDynamoDBClient } from "../../lib/dynamodb.js";

export async function onRequestPost({ request, env }) {
  const data = await request.json();
  const { email, year } = data;

  const client = createDynamoDBClient(env);

  await client.send(
    new PutItemCommand({
      TableName: env.db_table_optouts,
      Item: marshall({ email, year: parseInt(year, 10), timestamp: new Date().toISOString() }, {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true
      })
    })
  );

  return new Response(null, { status: 202 });
}
