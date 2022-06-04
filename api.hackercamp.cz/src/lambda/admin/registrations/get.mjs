import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { response, internalError, withCORS, notFound } from "../../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

async function getHackersRegistrations(page, pageSize) {
  console.log("Loading hackers data", { page, pageSize });
  const resp = await db.send(
    new ScanCommand({
      TableName: "hc-registrations",
      Select: "ALL_ATTRIBUTES",
      FilterExpression: "firstTime = :firstTime",
      ExpressionAttributeValues: marshall(
        { ":firstTime": false },
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
        "firstTime = :firstTime AND attribute_not_exists(referral)",
      ExpressionAttributeValues: marshall(
        { ":firstTime": true },
        { removeUndefinedValues: true }
      ),
    })
  );
  return resp.Items.map((x) => unmarshall(x));
}

async function getPlusOneRegistrations(page, pageSize) {
  console.log("Loading plus one data", { page, pageSize });
  const resp = await db.send(
    new ScanCommand({
      TableName: "hc-registrations",
      Select: "ALL_ATTRIBUTES",
      FilterExpression:
        "firstTime = :firstTime AND attribute_exists(referral)",
      ExpressionAttributeValues: marshall(
        { ":firstTime": true },
        { removeUndefinedValues: true }
      ),
    })
  );
  return resp.Items.map((x) => unmarshall(x));
}

function getData(type) {
  switch (type) {
    case "hackers":
      return getHackersRegistrations();
    case "plusOnes":
      return getPlusOneRegistrations();
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
  // TODO: authorization for admins
  const withCORS_ = withCORS(
    ["GET", "POST", "OPTIONS"],
    event.headers["origin"]
  );
  console.log("QS", event.queryStringParameters);
  const { type } = event.queryStringParameters;
  try {
    const data = await getData(type);
    if (!data) return withCORS_(notFound());
    return withCORS_(response(data));
  } catch (err) {
    console.error(err);
    return withCORS_(internalError());
  }
}
