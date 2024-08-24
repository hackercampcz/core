import csv from "@fast-csv/format";
import { response } from "../http.mjs";

function getAllHeaders(data) {
  const headers = new Set();
  for (const item of data.items) {
    for (const key of Object.keys(item)) {
      headers.add(key);
    }
  }
  return Array.from(headers);
}

export async function formatResponse(data, { year, resource, type, format }) {
  if (format === "csv" || format === "text/csv") {
    console.log({ event: "Formatting CSV" });
    const headers = getAllHeaders(data);
    const text = await csv.writeToString(data.items, { headers });
    const fileName = `hc-${year}-${resource}-${type}.csv`;
    return response(text, { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=${fileName}` });
  }
  return response(data);
}
