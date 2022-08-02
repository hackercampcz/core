/** @typedef { import("aws-lambda").DynamoDBStreamEvent } DynamoDBStreamEvent */

/**
 * @param {DynamoDBStreamEvent} event
 * @returns {Promise<void>}
 */
export async function handler(event) {
  for (const record of event.Records) {
    console.log(record);
  }
}
