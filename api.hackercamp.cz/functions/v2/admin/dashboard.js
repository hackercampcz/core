import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

async function* getRegistrations(client, year) {
  const result = await client.send(
    new ScanCommand({
      TableName: "registrations",
      ProjectionExpression: "email, #y, invoice_id, paid, invoiced, #ts",
      FilterExpression: "#y = :y",
      ExpressionAttributeNames: { "#y": "year", "#ts": "timestamp" },
      ExpressionAttributeValues: { ":y": { N: year.toString() } }
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

async function getAllRegistrations(client) {
  const result = [];
  for (const year of [2022, 2023, 2024, 2025]) {
    for await (const page of getRegistrations(client, year)) {
      result.push(...page);
    }
  }
  return result.map(x => ({
    year: x.year?.N,
    registered: x.timestamp?.S.substring(0, 10),
    invoiced: x.invoiced?.S.substring(0, 10),
    paid: x.paid?.S.substring(0, 10)
  }));
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ env }) {
  const client = new DynamoDBClient({
    region: env.AWS_REGION,
    credentialDefaultProvider: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY
    }
  });

  const regs = await getAllRegistrations(client);
  const regsByYear = Map.groupBy(regs, x => x.year);
  for (const [year, registrations] of regsByYear) {
    regsByYear.set(year, {
      registered: Map.groupBy(registrations, x => x.registered),
      invoiced: Map.groupBy(registrations, x => x.invoiced),
      paid: Map.groupBy(registrations, x => x.paid)
    });
  }

  const result = [];
  for (const [year, regGroups] of regsByYear) {
    const temp = [];
    for (const [date, { registered, invoiced, paid }] of regGroups) {
      temp.push([date, { registered: registered.length, invoiced: invoiced.length, paid: paid.length }]);
    }
    result.push([year, temp.sort((a, b) => a[0].localeCompare(b[0]))]);
  }
  return Response.json(result);
}
