import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { getTransactions } from "./lib/nfctron.js";

const dynamo = createClient();

async function getAttendees() {
  const result = await dynamo.scan({
    TableName: "hc-attendees",
    ProjectionExpression: "email, nfcTronData",
    FilterExpression:
      "#year = :year AND attribute_exists(nfcTronData) AND NOT ticketType IN (:volunteer, :crew)",
    ExpressionAttributeValues: {
      ":year": 2023,
      ":volunteer": "volunteer",
      ":crew": "crew",
    },
    ExpressionAttributeNames: { "#year": "year" },
  });
  return result.Items;
}

const transactionsToRefund = new Set([
  "ac5205b3-6d36-4837-adf9-de78cc342681",
  "b158bd5a-7b84-4828-896b-338b15484df6",
  "69acc380-676d-4ab5-bbaa-612052d6544c",
  "9b2faeb7-6b54-486d-92d0-fcfe20b02e00",
  "bdcbc6c2-a67f-4b84-b90f-4fceb227ebd5",
  "40ad4167-b6f8-49bb-baa9-ddd4b75a0077",
  "525f2bb1-a3a5-4a12-9d93-bf1b9193ce30",
  "636a3355-248d-4e5e-a84d-be54ccd12926",
  "9701379e-5b85-4125-97f1-f90a59176ab4",
  "5d6f94c6-26a6-42dc-981a-d750bd9205d8",
  "2eb66e90-1c37-4956-847a-48083e4dfaef",
  "f6b24992-e934-4f7f-a88d-326ab2dcd5e4",
  "12ca0a72-f087-408d-869c-ee6531d307aa",
  "0a89a912-f4c6-445f-8151-fac675fa5a68",
  "989adb01-67bc-44db-bb38-d30c90e2d3c2",
  "92a01654-8f42-417d-9338-488a19367b78",
  "14cf7a1e-6f9c-4643-8191-521bea24511e",
  "d2f28a1c-25c3-4389-9496-fbd567e22ae7",
  "f09d1995-0bf1-47f0-a27a-85ae494c3b1e",
  "e6d7a225-fe65-4526-ab54-8f5cf5b82782",
  "5bc45e32-be78-489c-81b9-3c5b5cc71d9a",
  "ef7e28e1-a424-4734-aa58-013ddb3fd892",
  "b30d00a8-e083-4cd2-9969-1eec567fbd4f",
  "cb041072-9f8a-47ca-9b76-abb942172c97",
  "54654c2d-e530-4c77-82ce-95159d4a3e13",
  "4bd72ab9-bb44-492e-84f6-191fd8afb87a",
  "f2bf542a-0b93-4cb5-a634-862996e4d0dd",
  "8cc1d73b-fba6-4337-8b3d-bffae9b65242",
  "9fd5931a-d25f-44fb-88e7-b711a2dd97b8",
  "8bbfe161-510f-493f-a4ac-b7eec5814e68",
  "d285d19f-a5cc-453e-992b-14d9e63cc3b4",
  "9cf63485-e829-4035-864d-5cba8f706e60",
  "e98264ea-377d-4338-b714-5fe4d2e6d39d",
  "461fb66e-52a2-4f7e-ad81-dae8d7a8e380",
  "43054eaf-9ca3-499f-ba2b-a86a15751abd",
  "f6ed5979-676b-4f57-9d4d-50170a196f7b",
  "f07611a6-10f5-434b-b222-4faae8b0625a",
  "03ffdb87-1acd-49d8-949f-b53d0c6a177e",
  "eb8d450f-1265-41d6-909e-d9e7cf2b9371",
  "77e9d6a0-6551-457b-bd19-2d59cc09ad87",
  "45b7d13e-9c8f-42c5-ad9d-5ecb7a0f91f5",
  "0f2671a7-04d7-4816-93eb-03e1f303c84d",
  "b4217df3-9733-4181-a6c9-0f45e5ad1acc",
]);

async function main({}) {
  const result = [];
  const attendees = await getAttendees();
  const data = attendees.flatMap((a) =>
    a.nfcTronData.filter((x) => x.sn).map((x) => [a.email, x.chipID])
  );
  for (const [email, chipID] of data) {
    const transactions = await getTransactions(chipID);
    for (const { transactionId, total } of transactions) {
      if (!transactionsToRefund.has(transactionId)) continue;
      result.push([email, total / 100]);
    }
  }
  const individuals = new Map();
  for (const [email, totalSpent] of result) {
    if (!individuals.has(email)) individuals.set(email, 0);
    individuals.set(email, individuals.get(email) + totalSpent);
  }
  console.log(
    JSON.stringify(Object.fromEntries(Array.from(individuals)), null, 2)
  );
  console.log({ total: result.reduce((a, [, total]) => a + total, 0) });
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config refundations.js
