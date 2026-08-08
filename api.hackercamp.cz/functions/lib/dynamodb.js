import { BatchGetItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { partition } from "@thi.ng/transducers";

/**
 * Create credential provider for AWS SDK clients
 *
 * @param {Object} env - Environment variables
 * @param {string} env.AWS_ACCESS_KEY_ID - AWS access key ID
 * @param {string} env.AWS_SECRET_ACCESS_KEY - AWS secret access key
 * @returns {() => {accessKeyId: string, secretAccessKey: string}} Credential provider function
 */
export function credentialProvider(env) {
  return () => ({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY
  });
}

/**
 * Create DynamoDB client with credentials from environment
 *
 * @param {Object} env - Environment variables
 * @param {string} env.AWS_REGION - AWS region
 * @param {string} env.AWS_ACCESS_KEY_ID - AWS access key ID
 * @param {string} env.AWS_SECRET_ACCESS_KEY - AWS secret access key
 * @returns {import("@aws-sdk/client-dynamodb").DynamoDBClient} DynamoDB client instance
 */
export function createDynamoDBClient(env) {
  return new DynamoDBClient({
    region: env.AWS_REGION,
    credentialDefaultProvider: credentialProvider(env)
  });
}

/**
 * Get items from DynamoDB in batches
 *
 * @param {import("@aws-sdk/client-dynamodb").DynamoDBClient} db - DynamoDB client
 * @param {string} tableName - Name of the DynamoDB table
 * @param {Array<{year: number, slackID: string}>} hits - Array of items with year and slackID
 * @param {Object} [queryOptions] - Optional query options for BatchGetItemCommand
 * @param {string} [queryOptions.ProjectionExpression] - Attributes to retrieve
 * @param {Object} [queryOptions.ExpressionAttributeNames] - Expression attribute names
 * @returns {Promise<Array<Record<string, any>>>} Array of unmarshallled items
 */
export async function getItemsFromDB(db, tableName, hits, queryOptions = {}) {
  const result = [];
  if (hits.length === 0) return result;

  for (const batch of partition(100, true, hits)) {
    const keys = batch.map(({ year, slackID }) => ({
      year: { N: year.toString() },
      slackID: { S: slackID }
    }));

    const items = await db.send(
      new BatchGetItemCommand({
        RequestItems: { [tableName]: { Keys: keys, ...queryOptions } }
      })
    );

    const tableItems = items.Responses[tableName] || [];
    result.push(
      ...tableItems
        .map(x => unmarshall(x))
        .sort((a, b) => -1 * (a.timestamp?.localeCompare(b.timestamp) || 0))
    );
  }

  return result;
}
