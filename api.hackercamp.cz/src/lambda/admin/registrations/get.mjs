import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { response, internalError, notFound } from "../../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

async function getConfirmedHackersRegistrations(page, pageSize) {
  console.log("Loading confirmed hackers data", { page, pageSize });
  const resp = await db.send(
    new ScanCommand({
      TableName: "hc-registrations",
      Select: "ALL_ATTRIBUTES",
      FilterExpression: "#ts > :ts AND attribute_not_exists(invoiced)",
      ExpressionAttributeNames: { "#ts": "timestamp" },
      ExpressionAttributeValues: marshall(
        { ":ts": "2022-05-31T00:00:00.000Z" },
        { removeUndefinedValues: true }
      ),
    })
  );
  return resp.Items.map((x) => unmarshall(x));
}

async function getHackersRegistrations(page, pageSize) {
  console.log("Loading hackers data", { page, pageSize });
  const resp = await db.send(
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
  return resp.Items.map((x) => unmarshall(x));
}

async function getWaitingListRegistrations(page, pageSize) {
  console.log("Loading waiting list data", { page, pageSize });
  const resp = await db.send(
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
  return resp.Items.map((x) => unmarshall(x));
}

async function getInvoicedRegistrations(page, pageSize) {
  console.log("Loading invoiced registrations", { page, pageSize });
  const resp = await db.send(
    new ScanCommand({
      TableName: "hc-registrations",
      Select: "ALL_ATTRIBUTES",
      FilterExpression:
        "attribute_exists(invoiced) AND attribute_not_exists(paid)",
    })
  );
  return resp.Items.map((x) => unmarshall(x));
}

async function getPaidRegistrations(page, pageSize) {
  console.log("Loading paid registrations", { page, pageSize });
  const resp = await db.send(
    new ScanCommand({
      TableName: "hc-registrations",
      Select: "ALL_ATTRIBUTES",
      FilterExpression: "attribute_exists(paid)",
    })
  );
  return resp.Items.map((x) => unmarshall(x));
}

function getData(type) {
  switch (type) {
    case "confirmed":
      return getConfirmedHackersRegistrations();
    case "hackers":
      return getHackersRegistrations();
    case "invoiced":
      return getInvoicedRegistrations();
    case "paid":
      return getPaidRegistrations();
    case "waitingList":
      return getWaitingListRegistrations();
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
  const { type } = event.queryStringParameters;
  try {
    const data = await getData(type);
    if (!data) return notFound();
    return response(data);
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
