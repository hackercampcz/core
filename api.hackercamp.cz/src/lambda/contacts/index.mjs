import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { notFound, response } from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});

async function getContact(dynamo, slackID, email) {
  const resp = await dynamo.send(
    new GetItemCommand({
      TableName: process.env.db_table_contacts,
      Key: marshall(
        { slackID, email },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
  return resp.Item ? unmarshall(resp.Item) : null;
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const params = event.queryStringParameters;
  console.log({ method: "GET", params });
  const contact = await getContact(dynamo, params.slackID, params.email);
  if (!contact) return notFound();
  return response(contact);
}
