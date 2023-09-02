import {
  DynamoDBClient,
  ScanCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { errorResponse, getHeader, response, withCORS } from "../http.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

const dynamo = new DynamoDBClient({});
const rollbar = Rollbar.init({ lambdaName: "attendees" });

async function getNfcTronData(chipID) {
  const resp = await fetch(
    `https://api.nfctron.com/receipt/v2/${chipID}/transaction`,
    {
      headers: { accept: "application/json" },
      referrer: "https://pass.nfctron.com/",
    }
  );
  return resp.json();
}

async function getAttendees(dynamo, year) {
  const result = await dynamo.send(
    new ScanCommand({
      TableName: process.env.db_table_attendees,
      Select: "ALL_ATTRIBUTES",
      FilterExpression: "#y = :y",
      ExpressionAttributeNames: { "#y": "year" },
      ExpressionAttributeValues: marshall({ ":y": year }),
    })
  );
  return result.Items.map((x) => unmarshall(x));
}

async function getAttendee(dynamo, slackID, year) {
  const result = await dynamo.send(
    new GetItemCommand({
      TableName: process.env.db_table_attendees,
      Key: marshall({ slackID, year }),
    })
  );
  return result.Item ? unmarshall(result.Item) : null;
}

async function readSpent(attendee) {
  for (const chip of attendee.nfcTronData?.filter((x) => x.sn) ?? []) {
    const nfcTron = await getNfcTronData(chip.chipID);
    Object.assign(chip, { spent: nfcTron.totalSpent / 100 });
  }
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function attendees(event) {
  const withCORS_ = withCORS(
    ["GET", "POST", "OPTIONS"],
    getHeader(event?.headers, "Origin") ?? "*"
  );
  if (event.httpMethod === "OPTIONS") {
    return withCORS_({
      statusCode: 204,
      body: "",
    });
  }
  try {
    const params = Object.assign({ year: "2022" }, event.queryStringParameters);
    console.log({ method: "GET", params });
    const year = parseInt(params.year, 10);
    if (params.slackID) {
      const attendee = await getAttendee(dynamo, params.slackID, year);
      //await readSpent(attendee);
      return withCORS_(response(attendee));
    }
    const attendees = await getAttendees(dynamo, year);
    // for (const attendee of attendees) {
    //   await readSpent(attendee);
    // }
    return withCORS_(response(attendees));
  } catch (err) {
    rollbar.error(err);
    return withCORS_(errorResponse(err));
  }
}

export const handler = rollbar.lambdaHandler(attendees);
