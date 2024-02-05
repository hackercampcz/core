import {
  readCSVObjects,
  writeCSVObjects,
} from "https://deno.land/x/csv@v0.7.5/mod.ts";
import * as date from "https://deno.land/x/date_fns@v2.22.1/parse/index.js";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb@master/mod.ts";

const dynamo = createClient();

function nfcTronID(s) {
  const [a, b, c, d, e, f, g, h, i, j] = Array.from(s);
  return [i, j, g, h, e, f, c, d, a, b].join("");
}

function parseDate(s) {
  return date.default(s, "d.M.y, H:mm", new Date());
}

/** @type {CommonCSVReaderOptions} */
const options = {
  columnSeparator: ";",
  lineSeparator: "\r\n",
};

async function readTranslationTable() {
  const result = new Map();
  const f = await Deno.open("./data/camp_trx.csv");
  try {
    for await (const obj of readCSVObjects(f, options)) {
      result.set(obj.SerialNumber, transformID(obj.ChipId));
    }
    return result;
  } finally {
    f.close();
  }
}

async function readCustomers() {
  const result = new Map();
  const f = await Deno.open("./data/Customers_Hacker_Camp.csv");
  try {
    for await (const x of readCSVObjects(f, options)) {
      result.set(nfcTronID(x.serial_number), {
        vip: x.vip === "TRUE",
        paid: x["zůstatek"] === "0 Kč",
        spent: parseInt(
          x["útrata"].replace("Kč", "").replace(/\s/, "").trim(),
          10
        ),
        firstTransaction: parseDate(x.first_transaction).toISOString(),
        lastTransaction: parseDate(x.last_transaction).toISOString(),
        sn: x.serial_number,
        chipID: x.chip_id,
      });
    }
    return result;
  } finally {
    f.close();
  }
}

async function getAttendees() {
  const result = await dynamo.scan({
    TableName: "attendees",
    ProjectionExpression: "slackID, #y, #n, company, nfcTronID, nfcTronData",
    ExpressionAttributeNames: {
      "#n": "name",
      "#y": "year",
    },
  });
  return result.Items;
}

function updateAttendee({ year, slackID }, nfcTronData) {
  if (!nfcTronData) return;
  return dynamo.updateItem({
    TableName: "attendees",
    Key: { year, slackID },
    UpdateExpression: "SET nfcTronData = :nfcTronData",
    ExpressionAttributeValues: { ":nfcTronData": [nfcTronData] },
  });
}

const customersData = await readCustomers();
const attendees = await getAttendees();
const namesByChipID = new Map(
  attendees
    .flatMap((x) => x.nfcTronData?.map((y) => [y.chipID, x.name]))
    .filter(Boolean)
);
const items = Array.from(customersData.values()).map((x) =>
  Object.assign({ name: namesByChipID.get(x.chipID) ?? "-" }, x)
);

const header = Object.keys(items[0]);
const f = await Deno.open("./data/nfc-tron.csv", {
  write: true,
  create: true,
  truncate: true,
});
try {
  await writeCSVObjects(f, items, { header });
} finally {
  f.close();
}
//
// for (const x of attendees) {
//   await updateAttendee(x, customersData.get(x.nfcTronID));
// }

// console.log(customersData.get("64a135eb04"));
// console.log(nfcTronID("64a135eb04"));
