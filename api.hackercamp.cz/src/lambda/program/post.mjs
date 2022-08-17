import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { getToken, validateToken } from "@hackercamp/lib/auth.mjs";
import {
  accepted,
  getHeader,
  internalError,
  readPayload,
  seeOther,
} from "../http.mjs";
import { postChatMessage } from "../slack.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});


/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  try {
    const data = readPayload(event);
    const token = getToken(event.headers);
    const payload = await validateToken(token, process.env.private_key);
    const submittedBy = payload["https://slack.com/user_id"];
    const year = parseInt(data.year, 10);
    console.log({ method: "POST", data, submittedBy, year });
    return seeOther(getHeader(event.headers, "Referer"));
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
