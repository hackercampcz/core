import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";

/**
 * The result can be an async iterator or just an array. This collects all the results to the array
 * @param result
 * @returns {Promise<Record<string, any>[]>}
 */
export async function collect(result) {
  if (result.Items) return result.Items;
  const items = [];
  for await (const page of result) {
    items.push(...page.Items);
  }
  return items;
}

/**
 * Creates a DynamoDB client with native JS values, like the former https://denopkg.com/chiefbiiko/dynamodb client.
 * Credentials and region are resolved from the environment, AWS_PROFILE and ~/.aws/credentials.
 * @param {import("@aws-sdk/client-dynamodb").DynamoDBClientConfig} [options]
 * @param {DynamoDBDocumentClient} [documentClient] test seam
 */
export function createClient(options = {}, documentClient) {
  const doc = documentClient ?? DynamoDBDocumentClient.from(new DynamoDBClient(options));

  /**
   * Scans the table and follows LastEvaluatedKey until all items are collected into a single response.
   * @param {import("@aws-sdk/lib-dynamodb").ScanCommandInput} input
   */
  async function scan(input) {
    const items = [];
    let lastEvaluatedKey, response;
    do {
      response = await doc.send(new ScanCommand({ ...input, ExclusiveStartKey: lastEvaluatedKey }));
      items.push(...(response.Items ?? []));
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    return { ...response, Items: items, Count: items.length };
  }

  return {
    scan,
    getItem: input => doc.send(new GetCommand(input)),
    putItem: input => doc.send(new PutCommand(input)),
    updateItem: input => doc.send(new UpdateCommand(input)),
    deleteItem: input => doc.send(new DeleteCommand(input))
  };
}
