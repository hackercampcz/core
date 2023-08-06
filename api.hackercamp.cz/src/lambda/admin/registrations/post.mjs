import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { fetchInvoice } from "../../fakturoid.mjs";
import { accepted, getHeader, readPayload, seeOther } from "../../http.mjs";
import { sendEmailWithTemplate, Template } from "../../postmark.mjs";
import { selectKeys } from "@hackercamp/lib/object.mjs";
import { getContact } from "../../dynamodb/registrations/paid.mjs";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

/** @type DynamoDBClient */
const db = new DynamoDBClient({});

/**
 * @param {DynamoDBClient} db
 * @param {{email: string, year: number}} data
 */
async function optout(db, { email, year }) {
  return db.send(
    new PutItemCommand({
      TableName: process.env.db_table_optouts,
      Item: marshall(
        { email, year },
        {
          convertEmptyValues: true,
          removeUndefinedValues: true,
        }
      ),
    })
  );
}

async function approve(db, { email, year, referral }) {
  console.log({ event: "Approving registration", email, year, referral });
  await db.send(
    new UpdateItemCommand({
      TableName: process.env.db_table_registrations,
      Key: marshall(
        { email, year },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
      UpdateExpression: "SET approved = :approved, approvedBy = :approvedBy",
      ExpressionAttributeValues: marshall({
        ":approved": new Date().toISOString(),
        ":approvedBy": referral,
      }),
    })
  );
  return sendEmailWithTemplate({
    token: process.env.postmark_token,
    templateId: Template.RegistrationApproved,
    data: {},
    from: "Hacker Camp Crew <team@hackercamp.cz>",
    to: data.params.email,
  });
}

async function sendVolunteerSlackInvitation(email, postmarkToken) {
  await sendEmailWithTemplate({
    token: postmarkToken,
    from: "Hacker Camp Crew <team@hackercamp.cz>",
    to: email,
    templateId: Template.VolunteerSlackInvite,
    data: {},
  });
  console.log({ event: "Volunteer slack invitation sent", email });
}

async function approveVolunteer(db, { registrations, referral }) {
  for (const registration of registrations) {
    console.log({
      event: "Marking volunteer registration as paid",
      ...registration,
    });
    const contact = await getContact(db, registration.email);
    if (!contact) {
      console.log({ event: "No contact found", email: registration.email });
      await sendVolunteerSlackInvitation(
        registration.email,
        process.env.postmark_token
      );
    }

    await db.send(
      new UpdateItemCommand({
        TableName: process.env.db_table_registrations,
        Key: marshall(registration, {
          removeUndefinedValues: true,
          convertEmptyValues: true,
        }),
        UpdateExpression:
          "SET paid = :paid, approved = :approved, approvedBy = :approvedBy",
        ExpressionAttributeValues: marshall({
          ":paid": new Date().toISOString(),
          ":approved": new Date().toISOString(),
          ":approvedBy": referral,
        }),
      })
    );
  }
}

async function invoiced(db, { registrations, invoiceId }) {
  const { fakturoid_token: token } = process.env;
  const { created_at: invoiced, id } = await fetchInvoice(token, invoiceId);
  for (const key of registrations) {
    console.log({
      event: "Marking registration as invoiced",
      invoiceId,
      ...key,
    });
    await db.send(
      new UpdateItemCommand({
        TableName: process.env.db_table_registrations,
        Key: marshall(key, {
          removeUndefinedValues: true,
          convertEmptyValues: true,
        }),
        UpdateExpression: "SET invoice_id = :invoice_id, invoiced = :invoiced",
        ExpressionAttributeValues: marshall(
          { ":invoice_id": id, ":invoiced": invoiced },
          {
            removeUndefinedValues: true,
            convertEmptyValues: true,
          }
        ),
      })
    );
  }
}

async function editRegistration(db, data) {
  console.log({ event: "Save registration", data });

  return db.send(
    new UpdateItemCommand({
      TableName: process.env.db_table_registrations,
      Key: marshall(
        selectKeys(data, new Set(["email", "year"]), ([k, v]) => [
          k,
          k === "year" ? parseInt(v, 10) : v,
        ])
      ),
      UpdateExpression:
        "SET firstName = :firstName, lastName = :lastName, phone = :phone, company = :company, edited = :now, editedBy = :editedBy, ticketType = :ticketType, paid = :paid," +
        "invRecipient = :invRecipient, invRecipientEmail = :invRecipientEmail, invRecipientPhone = :invRecipientPhone, invRecipientFirstname = :invRecipientFirstname, invRecipientLastname =:invRecipientLastname," +
        "invName = :invName, invAddress = :invAddress, invRegNo = :invRegNo, invVatNo = :invVatNo, invText =:invText, invEmail =:invEmail",
      ExpressionAttributeValues: marshall(
        {
          ":firstName": data.firstName,
          ":lastName": data.lastName,
          //":email": data.email,
          ":company": data.company,
          ":now": new Date().toISOString(),
          ":editedBy": data.editedBy,
          ":ticketType": data.ticketType,
          ":phone": data.phone,
          ":paid": data.paid ?? null,
          ":invRecipient": data.invRecipientEmail ? 1 : 0,
          ":invRecipientEmail": data.invRecipientEmail ?? null,
          ":invRecipientPhone": data.invRecipientPhone ?? null,
          ":invRecipientFirstname": data.invRecipientFirstname ?? null,
          ":invRecipientLastname": data.invRecipientLastname ?? null,
          ":invName": data.invName ?? null,
          ":invAddress": data.invAddress ?? null,
          ":invRegNo": data.invRegNo ?? null,
          ":invVatNo": data.invVatNo ?? null,
          ":invText": data.invText ?? null,
          ":invEmail": data.invEmail ?? null,
        },
        { removeUndefinedValues: true, convertEmptyValues: true }
      ),
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {*} data
 */
async function processRequest(db, data) {
  switch (data.command) {
    case "optout":
      await optout(db, data.params);
      break;
    case "approve":
      await approve(db, data.params);
      break;
    case "approveVolunteer":
      await approveVolunteer(db, data.params);
      break;
    case "invoiced":
      await invoiced(db, data.params);
      break;
    case "edit":
      await editRegistration(db, data.params);
      break;
  }
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const data = readPayload(event);
  console.log(data);
  try {
    await processRequest(db, data);
    if (getHeader(event.headers, "Accept") === "application/json") {
      return accepted();
    }
    return seeOther(getHeader(event.headers, "Referer"));
  } catch (err) {
    console.error(err);
  }
}
