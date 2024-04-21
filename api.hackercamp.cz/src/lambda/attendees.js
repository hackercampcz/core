import { BatchGetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { partition } from "@thi.ng/transducers";

/**
 * @param {DynamoDBClient} db
 * @param {string} tableName
 * @param hits
 * @param {KeysAndAttributes} [queryOptions]
 * @returns {Promise<Record<string, any>[]>}
 */
export async function getItemsFromDB(db, tableName, hits, queryOptions) {
  const result = [];
  if (hits.length === 0) return result;
  for (const batch of partition(100, true, hits)) {
    const keys = batch.map(({ year, slackID }) => ({
      year: { N: year.toString() },
      slackID: { S: slackID },
    }));
    const items = await db.send(
      new BatchGetItemCommand({
        RequestItems: { [tableName]: { Keys: keys, ...queryOptions } },
      }),
    );
    result.push(
      ...items.Responses[tableName]
        .map((x) => unmarshall(x))
        .sort((a, b) => -1 * a.timestamp?.localeCompare(b.timestamp)),
    );
  }
  return result;
}
