import { DynamoDBClient } from "@aws-sdk/client-dynamodb/dist-es/DynamoDBClient.js";
import { PutItemCommand } from "@aws-sdk/client-dynamodb/dist-es/commands/PutItemCommand.js";
import { marshall } from "@aws-sdk/util-dynamodb/dist-es/marshall.js";
import { getToken, validateToken } from "@hackercamp/lib/auth.mjs";
import { accepted, internalError, unauthorized, withCORS } from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

/**
 * @param {APIGatewayProxyEvent} event
 */
function readPayload(event) {
  const body = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf-8")
    : event.body;
  if (event.headers["Content-Type"] === "application/json") {
    return JSON.parse(body);
  }
  return new URLSearchParams(body);
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const withCORS_ = withCORS(["POST", "OPTIONS"], event.headers["origin"]);

  const token = getToken(event.headers);
  if (!validateToken(token, process.env["private_key"])) {
    return withCORS_(
      unauthorized({
        "WWW-Authenticate": `Bearer realm="https://donut.hackercamp.cz/", error="invalid_token"`,
      })
    );
  }

  try {
    const { email, year, ...payload } = readPayload(event);
    await db.send(
      new PutItemCommand({
        TableName: "hc-registrations",
        Item: marshall({ email, year, payload }, { convertEmptyValues: true }),
      })
    );
    return withCORS_(accepted());
  } catch (err) {
    console.error(err);
    return withCORS_(internalError());
  }
}
