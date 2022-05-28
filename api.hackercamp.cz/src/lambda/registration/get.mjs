import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { response, internalError, withCORS, notFound } from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

async function getRegistrationById(id) {
  const resp = await db.send(
    new ScanCommand({
      TableName: "hc-registrations",
      Select: "ALL_ATTRIBUTES",
      Limit: 1,
      FilterExpression: "id = :id",
      ExpressionAttributeValues: marshall({ ":id": id }),
    })
  );
  const [data] = resp.Items.map((x) => unmarshall(x));
  return data;
}

async function getRegistrationByEmail(email, year, slackID) {
  const [contactResp, regResp] = await Promise.all([
    db.send(
      new GetItemCommand({
        TableName: "hc-contacts",
        Key: { email, slackID },
      })
    ),
    db.send(
      new GetItemCommand({
        TableName: "hc-registrations",
        Key: { email, year },
      })
    ),
  ]);

  if (regResp.Item) {
    return unmarshall(regResp.Item);
  }
  if (contactResp.Item) {
    const contact =  unmarshall(contactResp.Item);
    return {
      invRegNo: contact.companyID,
      invVatNo: contact.vatID,
      invAddress: contact.address,
      invEmail: contact.email,
      invName: contact.company || contact.name,
    };
  }
  return null;
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const withCORS_ = withCORS(
    ["GET", "POST", "OPTIONS"],
    event.headers["origin"]
  );
  const { id, email, year, slackID } = event.queryStringParameters;
  try {
    const data = id
      ? await getRegistrationById(id)
      : await getRegistrationByEmail(email, year, slackID);
    if (!data) return withCORS_(notFound());
    return withCORS_(response(data));
  } catch (err) {
    console.error(err);
    return withCORS_(internalError());
  }
}
