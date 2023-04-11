import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { checkAuthorization } from "../auth.mjs";
import {
  getHeader,
  notFound,
  response,
  unauthorized,
  withCORS,
} from "../http.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});
const rollbar = Rollbar.init({ lambdaName: "contacts" });

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
export async function contacts(event) {
  const withCORS_ = withCORS(
    ["GET", "OPTIONS"],
    getHeader(event?.headers, "Origin") ?? "*",
    { allowCredentials: true }
  );
  try {
    await checkAuthorization(event);
    const params = event.queryStringParameters;
    console.log({ method: "GET", params });
    const contact = await getContact(dynamo, params.slackID, params.email);
    if (!contact) return withCORS_(notFound());
    return withCORS_(response(contact));
  } catch (err) {
    rollbar.error(err);
    return withCORS_(
      unauthorized({
        "WWW-Authenticate": `Bearer realm="https://donut.hackercamp.cz/", error="invalid_token"`,
      })
    );
  }
}

export const handler = rollbar.lambdaHandler(contacts);
