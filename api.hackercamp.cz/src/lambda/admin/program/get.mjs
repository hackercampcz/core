import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { response, internalError, notFound } from "../../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

async function getProgram(year) {
  console.log("Loading program", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_program,
      FilterExpression: "#yr = :yr",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        { ":yr": year },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}
function getData(type, year) {
  switch (type) {
    case "program":
      return getProgram(year);
    // TODO: events to approve
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
    const data = await getData(type, year);
    if (!data) return notFound();
    return response(data);
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
