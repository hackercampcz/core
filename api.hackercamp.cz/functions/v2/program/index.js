import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { authorize, getToken } from "../../lib/auth.js";
import { createDynamoDBClient } from "../../lib/dynamodb.js";

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ request, env }) {
  const token = getToken(request.headers);
  const isAuthorized = await authorize("admin", token, env.HC_JWT_SECRET);
  if (!isAuthorized) {
    return new Response(null, { status: 401 });
  }

  return Response.json([]);
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const token = getToken(request.headers);
  const isAuthorized = await authorize("admin", token, env.HC_JWT_SECRET);
  if (!isAuthorized) {
    return new Response(null, { status: 401 });
  }

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
