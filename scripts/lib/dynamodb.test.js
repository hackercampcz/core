import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collect, createClient } from "./dynamodb.js";

function stubDocumentClient(responses) {
  const commands = [];
  let i = 0;
  return {
    commands,
    send(command) {
      commands.push(command);
      const response = responses[Math.min(i++, responses.length - 1)];
      return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
    }
  };
}

describe("createClient", () => {
  it("scan collects all pages into a single response", async () => {
    const doc = stubDocumentClient([
      { Items: [{ slackID: "a" }], Count: 1, LastEvaluatedKey: { slackID: "a" } },
      { Items: [{ slackID: "b" }], Count: 1 }
    ]);
    const client = createClient({}, doc);
    const result = await client.scan({ TableName: "attendees", FilterExpression: "#y = :y" });
    assert.equal(doc.commands.length, 2);
    assert.ok(doc.commands[0] instanceof ScanCommand);
    assert.equal(doc.commands[0].input.TableName, "attendees");
    assert.equal(doc.commands[0].input.ExclusiveStartKey, undefined);
    assert.deepEqual(doc.commands[1].input.ExclusiveStartKey, { slackID: "a" });
    assert.deepEqual(result.Items, [{ slackID: "a" }, { slackID: "b" }]);
    assert.equal(result.Count, 2);
    assert.equal(result.LastEvaluatedKey, undefined);
    assert.equal(Object.prototype.hasOwnProperty.call(result, Symbol.asyncIterator), false);
  });

  it("scan returns single-page responses unchanged apart from Count", async () => {
    const doc = stubDocumentClient([{ Items: [{ slackID: "a" }], Count: 1, ConsumedCapacity: {} }]);
    const client = createClient({}, doc);
    const result = await client.scan({ TableName: "attendees" });
    assert.equal(doc.commands.length, 1);
    assert.deepEqual(result.Items, [{ slackID: "a" }]);
    assert.equal(result.Count, 1);
    assert.ok(result.ConsumedCapacity);
  });

  it("single-item commands wrap input in the matching command", async () => {
    const doc = stubDocumentClient([{ Item: { slackID: "a" } }, {}, {}, {}]);
    const client = createClient({}, doc);
    await client.getItem({ TableName: "attendees", Key: { slackID: "a", year: 2026 } });
    await client.putItem({ TableName: "contacts", Item: { email: "x@example.com" } });
    await client.updateItem({
      TableName: "attendees",
      Key: { slackID: "a" },
      UpdateExpression: "SET days = :days",
      ExpressionAttributeValues: { ":days": 3 }
    });
    await client.deleteItem({ TableName: "attendees", Key: { slackID: "a" } });
    assert.ok(doc.commands[0] instanceof GetCommand);
    assert.deepEqual(doc.commands[0].input.Key, { slackID: "a", year: 2026 });
    assert.ok(doc.commands[1] instanceof PutCommand);
    assert.deepEqual(doc.commands[1].input.Item, { email: "x@example.com" });
    assert.ok(doc.commands[2] instanceof UpdateCommand);
    assert.deepEqual(doc.commands[2].input.ExpressionAttributeValues, { ":days": 3 });
    assert.ok(doc.commands[3] instanceof DeleteCommand);
  });
});

describe("collect", () => {
  it("returns Items of a merged response directly and flattens async iterators", async () => {
    assert.deepEqual(await collect({ Items: [{ a: 1 }] }), [{ a: 1 }]);
    async function* pages() {
      yield { Items: [{ a: 1 }] };
      yield { Items: [{ b: 2 }] };
    }
    assert.deepEqual(await collect(pages()), [{ a: 1 }, { b: 2 }]);
  });
});
