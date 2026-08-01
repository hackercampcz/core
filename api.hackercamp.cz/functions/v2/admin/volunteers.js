import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

async function* getRegistrations(client, year) {
  const result = await client.send(
    new ScanCommand({
      TableName: "registrations",
      ProjectionExpression:
        "email, phone, firstName, lastName, #ts, volunteerArrivalDay, volunteerBar, volunteerConstruction, volunteerDriver, volunteerInfoDeskAndRegistration, volunteerSport, t-shirt-size",
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
      result.push(Object.fromEntries(Object.entries(reg).map(([key, value]) => [key, unmarshall(value)])));
    }
  }
  return Response.json(result.sort((a, b) => -1 * a.timestamp.localeCompare(b.timestamp)));
}
