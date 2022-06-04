import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import crypto from "crypto";
import {
  accepted,
  internalError,
  readPayload,
  seeOther,
  withCORS,
} from "../http.mjs";
import { sendEmailWithTemplate, Template } from "../postmark.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const withCORS_ = withCORS(
    ["GET", "POST", "OPTIONS"],
    event.headers["origin"]
  );

  try {
    const data = readPayload(event);
    if (event.headers.Accept === "application/json") {
      return withCORS_(accepted());
    }
    return withCORS_(seeOther());
  } catch (err) {
    console.error(err);
    return withCORS_(internalError());
  }
}
