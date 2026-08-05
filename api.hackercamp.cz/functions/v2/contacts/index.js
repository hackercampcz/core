import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { createDynamoDBClient } from "../../lib/dynamodb.js";
import { authorize, getToken } from "../../lib/auth.js";

async function getContact(db, slackID, email) {
  const resp = await db.send(
    new GetItemCommand({
      TableName: "contacts",
      Key: marshall({ slackID, email }, { removeUndefinedValues: true, convertEmptyValues: true })
    })
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  console.log({ method: "GET", params: Object.fromEntries(params) });

  const token = getToken(request.headers);
  const isAuthorized = await authorize("admin", token, env.HC_JWT_SECRET);
  if (!isAuthorized) {
    return new Response(null, { status: 401 });
  }

  const client = createDynamoDBClient(env);

  const contact = await getContact(client, params.get("slackID"), params.get("email"));
  return Response.json(contact);
}
