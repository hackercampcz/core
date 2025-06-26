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
    registered: x.timestamp?.S?.substring(0, 10),
    invoiced: x.invoiced?.S?.substring(0, 10),
    paid: x.paid?.S?.substring(0, 10)
  }));
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ env }) {
  function credentialProvider() {
    return {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY
    };
  }
  const client = new DynamoDBClient({
    region: env.AWS_REGION,
    credentialDefaultProvider: credentialProvider
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
  for (const [year, groups] of regsByYear) {
    const temp = new Map();
    for (const [key, group] of Object.entries(groups)) {
      for (const [date, items] of group) {
        if (!date) continue;
        const stats = temp.get(date) ?? { registered: 0, invoiced: 0, paid: 0 };
        stats[key] += items.length;
        temp.set(date, stats);
      }
    }
    result.push([year, Array.from(temp.entries()).sort((a, b) => a[0].localeCompare(b[0]))]);
  }
  return Response.json(result);
}
