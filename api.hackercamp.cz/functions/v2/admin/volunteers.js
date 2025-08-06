import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

async function* getRegistrations(client, year) {
  const result = await client.send(
    new ScanCommand({
      TableName: "registrations",
      ProjectionExpression:
        "email, firstName, lastName, #y, #ts, volunteerArrivalDay, volunteerBar, volunteerConstruction, volunteerDriver, volunteerInfoDeskAndRegistration, volunteerSport",
      FilterExpression: "#y = :y AND ticketType = :volunteer",
      ExpressionAttributeNames: { "#y": "year", "#ts": "timestamp" },
      ExpressionAttributeValues: {
        ":y": { N: year.toString() },
        ":volunteer": { S: "volunteer" }
      }
    })
  );
  if (result.hasOwnProperty(Symbol.asyncIterator)) {
    for await (const page of result) {
      yield page.Items;
    }
  } else {
    yield result.Items;
  }
}

function credentialProvider(env) {
  return () => ({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY
  });
}

function unmarshall(item) {
  if (item.N) return Number.parseInt(item.N);
  if (item.S === "on") return true;
  return item.S;
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const year = Number.parseInt(url.searchParams.get("year"));
  const client = new DynamoDBClient({
    region: env.AWS_REGION,
    credentialDefaultProvider: credentialProvider(env)
  });

  const result = [];
  for await (const regs of getRegistrations(client, year)) {
    for (const reg of regs) {
      const volunteer = {};
      for (const [key, value] of Object.entries(reg)) {
        volunteer[key] = unmarshall(value);
      }
      result.push(volunteer);
    }
  }
  return Response.json(result);
}
