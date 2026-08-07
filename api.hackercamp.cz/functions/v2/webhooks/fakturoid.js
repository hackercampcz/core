import { createDynamoDBClient } from "#lib/dynamodb.js";
import { Attachments, getTemplateId, sendEmailWithTemplate, Template } from "#lib/postmark.js";
import { QueryCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {Number} invoice_id
 * @returns {Promise<Record<string, *>[]>}
 */
async function getInvoicedRegistrations(db, env, invoice_id) {
  const tableName = env.db_table_registrations;
  const resp = await db.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: `${tableName}-by-invoice-id`,
      KeyConditionExpression: "invoice_id = :id",
      ExpressionAttributeValues: { ":id": { N: invoice_id.toString() } },
      ExpressionAttributeNames: { "#year": "year" },
      ProjectionExpression: "#year, email"
    })
  );
  return resp.Items;
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {Record<string, any>[]} registrations
 * @param {String} paid_at
 * @param {String} invoice_id
 * @returns {Promise<void>}
 */
async function markAsPaid(db, env, registrations, paid_at, invoice_id) {
  const { start_date, end_date, postmark_token } = env;
  for (const registration of registrations) {
    console.log({ event: "Marking as paid", ...registration });
    await db.send(
      new UpdateItemCommand({
        TableName: env.db_table_registrations,
        Key: registration,
        UpdateExpression: "SET paid = :paid",
        ExpressionAttributeValues: { ":paid": { S: new Date(paid_at).toISOString() } }
      })
    );
    console.log({ event: "Sending e-mail", to: registration.email.S, template: Template.RegistrationPaid });
    await sendEmailWithTemplate({
      token: postmark_token,
      templateId: getTemplateId(env, Template.RegistrationPaid),
      data: {},
      to: registration.email.S,
      attachments: [Attachments.calendarInvite(start_date, end_date)],
      tag: "registration-paid"
    });
    console.log({ event: "Invoice marked as paid", invoice_id, ...registration });
  }
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {Record<string, any>[]} registrations
 * @param {String} paid_at
 * @param {String} invoice_id
 * @returns {Promise<void>}
 */
async function markAsCancelled(db, env, registrations, paid_at, invoice_id) {
  for (const registration of registrations) {
    console.log({ event: "Marking as canceled", ...registration });
    await db.send(
      new UpdateItemCommand({
        TableName: env.db_table_registrations,
        Key: registration,
        UpdateExpression: "SET cancelled = :now",
        ExpressionAttributeValues: { ":now": { S: new Date(paid_at).toISOString() } }
      })
    );
    console.log({ event: "Invoice marked as cancelled", invoice_id, ...registration });
  }
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const client = createDynamoDBClient(env);
  const { token } = new URL(request.url).searchParams;

  if (token !== env.fakturoid_webhook_token) {
    console.log({ event: "Invalid token", token });
    return new Response(null, { status: 401 });
  }

  const payload = await request.json();
  console.log({ payload });

  switch (payload.event_name) {
    case "invoice_overdue": {
      // there is nothing we want to do, accept it for now.
      return new Response(null, { status: 202 });
    }
    case "invoice_paid": {
      const { invoice_id, paid_at, paid_on } = payload;
      const registrations = await getInvoicedRegistrations(client, env, invoice_id);
      if (!registrations.length) {
        console.log({ event: "Registrations not found", invoice_id });
        return new Response(null, { status: 404 });
      }

      if (payload.total < 0) {
        // the canceled invoice has a negative total to compensate the balance
        await markAsCancelled(client, env, registrations, paid_on ?? paid_at, invoice_id);
      } else {
        await markAsPaid(client, env, registrations, paid_on ?? paid_at, invoice_id);
      }
      return Response.json({});
    }
    default: {
      console.log({ event: "Unknown event", payload });
      return new Response(null, { status: 422 });
    }
  }
}
