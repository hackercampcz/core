import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";

const dynamo = createClient();

async function* getAttendees(year) {
  const result = await dynamo.scan({
    TableName: "hc-attendees",
    ProjectionExpression: "slackID, nfcTronData",
    FilterExpression: "#year = :year AND attribute_exists(nfcTronData)",
    ExpressionAttributeValues: { ":year": year },
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

async function updateAttendee(year, slackID, nfcTronData) {
  await dynamo.updateItem({
    TableName: "hc-attendees",
    Key: { year, slackID },
    UpdateExpression: "SET nfcTronData = :nfcTronData",
    ExpressionAttributeValues: { ":nfcTronData": nfcTronData },
  });
}

async function getTransactions(chipID) {
  const resp = await retry(() =>
    fetch(`https://api.nfctron.com/receipt/v2/${chipID}/transaction`)
  );
  if (!resp) return [];
  const data = await resp.json();
  if (Array.isArray(data.transactions)) {
    return [data.transactions, data.totalSpent / 100];
  }
  return [];
}
async function sleep(number) {
  return new Promise((resolve, reject) => setTimeout(resolve, number));
}

async function retry(callback, retryCount = 3) {
  var lastResult = null;
  for (let i = 0; i < retryCount; i++) {
    const result = await callback();
    lastResult = result;
    if (result.ok) return result;
    else if (result.status === 404) return null;
    else await sleep(2 ** (i + 1) * 10000);
  }
  console.log(await lastResult.json());
  throw new Error();
}

async function main({ year }) {
  const attendees = await getAttendees(year);
  for await (const page of attendees) {
    for (const attendee of page) {
      for (const data of attendee.nfcTronData.filter((x) => x.sn)) {
        if (attendee.nfcTronData.transactions) continue;
        const [transactions, totalSpent] = await getTransactions(data.chipID);
        if (!transactions?.length) continue;
        data.transactions = transactions;
        data.totalSpent = totalSpent;
      }
      await updateAttendee(
        year,
        attendee.slackID,
        attendee.nfcTronData.filter((x) => x.sn)
      );
    }
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config nfctron-transactions-sync.js --year=2023
