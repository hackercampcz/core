import {
  DynamoDBClient,
  ScanCommand,
  ExecuteStatementCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { response, internalError, notFound } from "../../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

async function getOptOuts(year) {
  console.log("Loading opt-outs");
  const res = await db.send(
    new ScanCommand({
      TableName: "hc-optouts",
      ProjectionExpression: "email",
      FilterExpression: "#y = :y",
      ExpressionAttributeNames: { "#y": "year" },
      ExpressionAttributeValues: marshall({ ":y": year }),
    })
  );
  return new Set(res.Items.map((x) => x.email.S));
}

async function getConfirmedHackersRegistrations(year) {
  console.log("Loading confirmed hackers data", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: "hc-registrations",
      Select: "ALL_ATTRIBUTES",
      FilterExpression:
        "#ts > :ts AND attribute_not_exists(invoiced) AND (firstTime = :false OR (attribute_exists(referral) AND attribute_type(referral, :string)))",
      ExpressionAttributeNames: { "#ts": "timestamp" },
      ExpressionAttributeValues: marshall(
        {
          ":false": false,
          ":ts": "2022-05-31T00:00:00.000Z",
          ":string": "S",
        },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getHackersRegistrations(year) {
  console.log("Loading hackers data", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: "hc-registrations",
      Select: "ALL_ATTRIBUTES",
      FilterExpression:
        "firstTime = :false AND #ts < :ts AND attribute_not_exists(invoiced)",
      ExpressionAttributeNames: { "#ts": "timestamp" },
      ExpressionAttributeValues: marshall(
        {
          ":false": false,
          ":ts": "2022-05-31T00:00:00.000Z",
        },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getWaitingListRegistrations(year) {
  console.log("Loading waiting list data", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: "hc-registrations",
      Select: "ALL_ATTRIBUTES",
      FilterExpression:
        "firstTime = :true AND attribute_not_exists(invoiced) AND (attribute_not_exists(referral) OR attribute_type(referral, :null))",
      ExpressionAttributeValues: marshall(
        { ":true": true, ":null": "NULL" },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getInvoicedRegistrations(year) {
  console.log("Loading invoiced registrations", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: "hc-registrations",
      Select: "ALL_ATTRIBUTES",
      FilterExpression:
        "attribute_exists(invoiced) AND attribute_not_exists(paid)",
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getPaidRegistrations(year) {
  console.log("Loading paid registrations", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: "hc-registrations",
      Select: "ALL_ATTRIBUTES",
      FilterExpression: "attribute_exists(paid)",
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

function getData(type, year) {
  switch (type) {
    case "confirmed":
      return getConfirmedHackersRegistrations(year);
    case "hackers":
      return getHackersRegistrations(year);
    case "invoiced":
      return getInvoicedRegistrations(year);
    case "paid":
      return getPaidRegistrations(year);
    case "waitingList":
      return getWaitingListRegistrations(year);
    case "optouts":
      return null;
    default:
      throw new Error(`Unknown type ${type}`);
  }
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  console.log("QS", event.queryStringParameters);
  const { type, year } = Object.assign(
    { year: 2022 },
    event.queryStringParameters
  );
  try {
    const [optouts, data] = await Promise.all([
      getOptOuts(year),
      getData(type, year),
    ]);
    if (type === "optouts") return response(Array.from(optouts));
    if (!data) return notFound();
    return response(data.filter((x) => !optouts.has(x.email)));
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
