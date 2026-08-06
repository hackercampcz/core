import csv from "@fast-csv/format";

/**
 * @param {Request} request
 * @returns {boolean}
 */
export function acceptsCSV(request) {
  const format = request.headers.get("Accept");
  return format === "csv" || format === "text/csv";
}

function getAllHeaders(data) {
  const headers = new Set();
  for (const item of data.items) {
    for (const key of Object.keys(item)) {
      headers.add(key);
    }
  }
  return Array.from(headers);
}

export async function csv(data, { year, resource, type }) {
  console.log({ event: "Formatting CSV" });
  const headers = getAllHeaders(data);
  const text = await csv.writeToString(data.items, { headers });
  const fileName = `hc-${year}-${resource}-${type}.csv`;
  return new Response(text, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=${fileName}`
    }
  });
}
