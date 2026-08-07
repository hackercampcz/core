import { createDynamoDBClient } from "#lib/dynamodb.js";
import { ScanCommand } from "@aws-sdk/client-dynamodb";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */

/**
 * @param {DynamoDBClient} client
 * @param {Number} year
 * @param {Env} env
 * @returns {AsyncGenerator<Record<string, any>[], void, *>}
 */
async function* getRegistrations(client, year, env) {
  const result = await client.send(
    new ScanCommand({
      TableName: env.db_table_registrations,
      ProjectionExpression: "email, #y, invoice_id, paid, invoiced, #ts",
      FilterExpression: "#y = :y AND ticketType <> :volunteer",
      ExpressionAttributeNames: { "#y": "year", "#ts": "timestamp" },
      ExpressionAttributeValues: { ":y": { N: year.toString() }, ":volunteer": { S: "volunteer" } }
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

/**
 * @param {DynamoDBClient} client
 * @param {Env} env
 * @returns {Promise<{year: *, registered: *, invoiced: *, paid: *}[]>}
 */
async function getAllRegistrations(client, env) {
  const result = [];
  for (const year of [2022, 2023, 2024, 2025, 2026]) {
    for await (const page of getRegistrations(client, year, env)) {
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
  const client = createDynamoDBClient(env);

  const regs = await getAllRegistrations(client, env);
  const regsByYear = Map.groupBy(regs, x => x.year);
  for (const [year, registrations] of regsByYear) {
    regsByYear.set(
      year,
      Object.entries({
        r: Map.groupBy(registrations, x => x.registered),
        i: Map.groupBy(registrations, x => x.invoiced),
        p: Map.groupBy(registrations, x => x.paid)
      })
    );
  }

  const result = [];
  for (const [year, groups] of regsByYear) {
    const days = new Map();
    for (const [key, group] of groups) {
      for (const [date, items] of group) {
        if (!date) continue;
        const stats = days.getOrInsert(date, { r: 0, i: 0, p: 0 });
        stats[key] += items.length;
      }
    }
    result.push([
      year,
      Array.from(days.entries())
        .map(([k, { r, i, p }]) => [k, [r, i, p]])
        .sort((a, b) => a[0].localeCompare(b[0]))
    ]);
  }
  return Response.json(result);
}
