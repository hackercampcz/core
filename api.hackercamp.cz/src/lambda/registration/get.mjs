import { DynamoDBClient, GetItemCommand, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { notFound, response } from "../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

async function getRegistrationById(id) {
  console.log({ event: "Loading data by id", id });
  const tableName = process.env.db_table_registrations;
  const indexResp = await db.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: `${tableName}-by-id`,
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: { ":id": { S: id } },
      ExpressionAttributeNames: { "#year": "year" },
      ProjectionExpression: "#year, email",
    }),
  );
  const resp = await db.send(
    new GetItemCommand({
      TableName: tableName,
      Key: indexResp.Items[0],
    }),
  );
  return unmarshall(resp.Item);
}

async function getRegistrationByEmail(email, year, slackID) {
  console.log({
    event: "Loading data by registered used",
    email,
    year,
    slackID,
  });
  const [contactResp, regResp] = await Promise.all([
    db.send(
      new GetItemCommand({
        TableName: "contacts",
        Key: marshall({ email, slackID }),
      }),
    ),
    db.send(
      new GetItemCommand({
        TableName: "registrations",
        Key: marshall({ email, year: parseInt(year) }),
      }),
    ),
  ]);

  if (regResp.Item) {
    console.log({ event: "Got registration", registration: regResp.Item });
    return unmarshall(regResp.Item);
  }

  if (contactResp.Item) {
    console.log({ event: "Got contact", contact: contactResp.Item });
    const contact = unmarshall(contactResp.Item);
    const [firstName, lastName] = contact.name.split(" ");
    return {
      firstName,
      lastName,
      email: contact.email,
      company: contact.company,
      invRegNo: contact.companyID,
      invVatNo: contact.vatID,
      invAddress: contact.address,
      invEmail: contact.invoiceEmail || contact.email,
      invName: contact.company || contact.name,
    };
  }

  console.log({ event: "Nothing found", email, year, slackID });
  return null;
}

function getData({ queryStringParameters }) {
  const { id, email, year, slackID } = queryStringParameters;
  if (id) {
    return getRegistrationById(id);
  } else if (email && year && slackID) {
    return getRegistrationByEmail(email, parseInt(year), slackID);
  } else {
    return null;
  }
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  console.log("QS", event.queryStringParameters);

  const data = await getData(event);
  if (!data) return notFound();
  return response(data);
}
