import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { response, internalError, notFound } from "../../http.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

async function getAttendees(year) {
  console.log("Loading attendees", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_attendees,
      Select: "ALL_ATTRIBUTES",
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

async function getHackerAttendees(year) {
  console.log("Loading attendees", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_attendees,
      Select: "ALL_ATTRIBUTES",
      FilterExpression:
        "#yr = :yr AND NOT (ticketType IN (:crew, :staff, :volunteer))",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        {
          ":yr": year,
          ":crew": "crew",
          ":staff": "staff",
          ":volunteer": "volunteer",
        },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getCrewAttendees(year) {
  console.log("Loading attendees", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_attendees,
      FilterExpression: "#yr = :yr AND ticketType = :crew",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        {
          ":yr": year,
          ":crew": "crew",
        },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getStaffAttendees(year) {
  console.log("Loading attendees", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_attendees,
      FilterExpression: "#yr = :yr AND ticketType = :staff",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        {
          ":yr": year,
          ":staff": "staff",
        },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

async function getVolunteerAttendees(year) {
  console.log("Loading attendees", { year });
  const res = await db.send(
    new ScanCommand({
      TableName: process.env.db_table_attendees,
      FilterExpression: "#yr = :yr AND ticketType = :volunteer",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: marshall(
        {
          ":yr": year,
          ":volunteer": "volunteer",
        },
        { removeUndefinedValues: true }
      ),
    })
  );
  return res.Items.map((x) => unmarshall(x));
}

function getData(type, year) {
  switch (type) {
    case "attendees":
      return getAttendees(year);
    case "crewAttendees":
      return getCrewAttendees(year);
    case "staffAttendees":
      return getStaffAttendees(year);
    case "volunteerAttendees":
      return getVolunteerAttendees(year);
    case "hackerAttendees":
      return getHackerAttendees(year);
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
    { year: "2022" },
    event.queryStringParameters
  );
  try {
    const data = await getData(type, parseInt(year));
    if (!data) return notFound();
    return response(data);
  } catch (err) {
    console.error(err);
    return internalError();
  }
}
