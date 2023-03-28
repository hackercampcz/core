import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";

const dynamo = createClient();

async function markAsPaid(registration, paidAt) {
  await dynamo.updateItem({
    TableName: "hc-registrations",
    Key: registration,
    UpdateExpression: "SET paid = :paid",
    ExpressionAttributeValues: {
      ":paid": new Date(paidAt).toISOString(),
    },
  });
}

async function getRegistrations(invoiceId) {
  const result = await dynamo.scan({
    TableName: "hc-registrations",
    ProjectionExpression: "email,#y",
    ExpressionAttributeNames: { "#y": "year" },
    FilterExpression: "invoice_id = :invoice_id",
    ExpressionAttributeValues: {
      ":invoice_id": invoiceId,
    },
  });
  return result.Items;
}

async function main({ invoiceId, paidAt }) {
  console.log({ invoiceId, paidAt: new Date(paidAt).toISOString() });
  const registrations = await getRegistrations(invoiceId);
  for (const registration of registrations)
    await markAsPaid(registration, paidAt);
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config invoice-paid.js --invoiceId 1 --paidAt 2022-07-12
