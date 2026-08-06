import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { createDynamoDBClient } from "../../lib/dynamodb.js";

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const data = await request.json();
  const sanitizedData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v?.trim ? v.trim() : v]));

  const client = createDynamoDBClient(env);

  await client.send(
    new UpdateItemCommand({
      TableName: env.db_table_registrations,
      Key: { email: { S: data.email }, year: { N: data.year.toString() } },
      UpdateExpression:
        "SET activity = :activity, activityCrew = :activityCrew, activityPlace = :activityPlace, programEdited = :programEdited",
      ExpressionAttributeValues: marshall({
        ":activity": sanitizedData.activity,
        ":activityCrew": sanitizedData.activityCrew,
        ":activityPlace": sanitizedData.activityPlace,
        ":programEdited": new Date().toISOString()
      }, { removeUndefinedValues: true, convertEmptyValues: true })
    })
  );

  return new Response(null, { status: 202 });
}
