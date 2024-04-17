import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import Rollbar from "../../rollbar.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef {import("aws-lambda").DynamoDBStreamEvent} DynamoDBStreamEvent */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});
const rollbar = Rollbar.init({ lambdaName: "dynamodb-reindex-attendees" });

/**
 * @param {DynamoDBStreamEvent} event
 * @returns {Promise<void>}
 */

async function subscriptionChange(event) {
  rollbar.configure({ payload: { event } });
  const { db_table_optouts, year } = process.env;
  try {
    for (const record of event.Records) {
      const image = unmarshall(record.dynamodb.NewImage);
      if (image.RecordType !== "SubscriptionChange") continue;

      await db.send(
        new PutItemCommand({
          TableName: db_table_optouts,
          Item: marshall(
            {
              email: image.Recipient,
              year: parseInt(year, 10),
              timestamp: new Date().toISOString(),
            },
            {
              convertEmptyValues: true,
              removeUndefinedValues: true,
              convertClassInstanceToMap: true,
            },
          ),
        }),
      );
    }
  } catch (err) {
    rollbar.error(err);
  }
}

export const handler = rollbar.lambdaHandler(subscriptionChange);
