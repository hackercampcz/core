import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { difference } from "https://deno.land/std@0.201.0/datetime/mod.ts";
import { writeCSVObjects } from "https://deno.land/x/csv@v0.9.1/mod.ts";
const dynamo = createClient();

async function* getAttendees() {
  const result = await dynamo.scan({
    TableName: "hc-attendees",
    FilterExpression:
      "#year = :year AND attribute_exists(checkIn) AND not attribute_exists(checkout) AND ticketType IN (:volunteer, :staff, :crew)",
    ExpressionAttributeValues: {
      ":year": 2023,
      ":volunteer": "volunteer",
      ":staff": "staff",
      ":crew": "crew",
    },
    ExpressionAttributeNames: { "#year": "year" },
  });
  if (result.hasOwnProperty(Symbol.asyncIterator)) {
    for await (const page of result) {
      yield page.Items;
    }
  } else {
    yield result.Items;
  }
}

function getHeaders(result) {
  const headers = new Set();
  for (const item of result) {
    for (const key of Object.keys(item)) {
      headers.add(key);
    }
  }
  headers.delete("VIP pokladna");
  return Array.from(headers);
}

function fillEmptyValues(result, header) {
  for (const item of result) {
    for (const key of header) {
      if (!item.hasOwnProperty(key)) {
        item[key] = "";
      }
    }
  }
}

async function main({}) {
  const result = [];
  const attendees = await getAttendees();
  for await (const page of attendees) {
    for (const { email, nfcTronData } of page) {
      const placesSpent = new Map();
      for (const { transactions } of nfcTronData) {
        for (const { total, placeName } of transactions) {
          if (placesSpent.has(placeName)) {
            placesSpent.set(
              placeName,
              placesSpent.get(placeName) + total / 100
            );
          } else {
            placesSpent.set(placeName, total / 100);
          }
        }
      }
      result.push(Object.assign({ email }, Object.fromEntries(placesSpent)));
    }
  }
  const f = await Deno.open("./data/vip-per-place.csv", {
    write: true,
    create: true,
    truncate: true,
  });
  try {
    const header = getHeaders(result);
    fillEmptyValues(result, header);
    await writeCSVObjects(f, result, { header });
  } finally {
    f.close();
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config adhoc.js
