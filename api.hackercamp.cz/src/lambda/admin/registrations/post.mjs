import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  TransactWriteItemsCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { fetchInvoice, getAuthHeader } from "@hackercamp/lib/fakturoid.js";
import { getContact } from "../../dynamodb/registrations/paid.mjs";
import { accepted, getHeader, readPayload, seeOther } from "../../http.mjs";
import { Attachments, sendEmailWithTemplate, Template } from "../../postmark.mjs";

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
      Item: marshall({ email, year }, { convertEmptyValues: true, removeUndefinedValues: true })
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {{slackID: string, year: number}} data
 */
async function getAttendee(db, { slackID, year }) {
  console.log("Get attendee", { slackID, year });
  const result = await db.send(
    new GetItemCommand({
      TableName: process.env.db_table_attendees,
      Key: { slackID: { S: slackID }, year: { N: year.toString() } }
    })
  );
  return result.Item;
}

/**
 * @param {DynamoDBClient} db
 * @param {{email: string, year: number}} data
 */
async function getRegistration(db, { email, year }) {
  console.log("Get registration", { email, year });
  const resp = await db.send(
    new GetItemCommand({
      TableName: process.env.db_table_registrations,
      Key: { email: { S: email }, year: { N: year.toString() } }
    })
  );
  return resp.Item;
}

/**
 * @param {DynamoDBClient} db
 * @param {{email: string, year: number, slackID: string}} data
 */
async function moveToTrash(db, { email, year, slackID }) {
  console.log({ event: "Moving registration to trash", email, year });

  const reg = await getRegistration(db, { email, year });
  await db.send(
    new PutItemCommand({
      TableName: "trash",
      Item: Object.assign({}, reg, {
        deletedBy: { S: slackID },
        deleted: { S: new Date().toISOString() }
      })
    })
  );
  await db.send(
    new DeleteItemCommand({
      TableName: process.env.db_table_registrations,
      Key: { email: { S: email }, year: { N: year.toString() } }
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {*} data
 */
function addRegistration(db, data) {
  console.log({ event: "Put registration", data });

  return db.send(
    new PutItemCommand({
      TableName: process.env.db_table_registrations,
      Item: marshall({ ...data }, { convertEmptyValues: true, removeUndefinedValues: true })
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {{email: string, year: number, referral: string}} data
 */
async function approve(db, { email, year, referral }) {
  console.log({ event: "Approving registration", email, year, referral });
  await db.send(
    new UpdateItemCommand({
      TableName: process.env.db_table_registrations,
      Key: marshall({ email, year }, { removeUndefinedValues: true, convertEmptyValues: true }),
      UpdateExpression: "SET approved = :approved, approvedBy = :approvedBy",
      ExpressionAttributeValues: marshall({ ":approved": new Date().toISOString(), ":approvedBy": referral })
    })
  );
  return sendEmailWithTemplate({
    token: process.env.postmark_token,
    templateId: Template.RegistrationApproved,
    data: {},
    to: email,
    tag: "registration-approved"
  });
}

async function sendVolunteerSlackInvitation(email, postmarkToken) {
  await sendEmailWithTemplate({
    token: postmarkToken,
    to: email,
    templateId: Template.VolunteerSlackInvite,
    data: {},
    tag: "volunteer-slack-invitation"
  });
  console.log({ event: "Volunteer slack invitation sent", email });
}

/**
 * @param {DynamoDBClient} db
 * @param {{registrations: Array<Record<string, any>>, referral: string}} data
 */
async function approveVolunteer(db, { registrations, referral }) {
  for (const registration of registrations) {
    console.log({ event: "Marking volunteer registration as paid", ...registration });
    const contact = await getContact(db, registration.email);
    if (!contact) {
      console.log({ event: "No contact found", email: registration.email });
      await sendVolunteerSlackInvitation(registration.email, process.env.postmark_token);
    }

    await db.send(
      new UpdateItemCommand({
        TableName: process.env.db_table_registrations,
        Key: marshall(registration, { removeUndefinedValues: true, convertEmptyValues: true }),
        UpdateExpression: "SET paid = :paid, approved = :approved, approvedBy = :approvedBy",
        ExpressionAttributeValues: marshall({
          ":paid": new Date().toISOString(),
          ":approved": new Date().toISOString(),
          ":approvedBy": referral
        })
      })
    );
  }
}

/**
 * @param {DynamoDBClient} db
 * @param {{registrations: Array<Record<string, any>>, invoiceId: number}} data
 */
async function invoiced(db, { registrations, invoiceId }) {
  const { fakturoid_client_id, fakturoid_client_secret } = process.env;
  const authHeader = await getAuthHeader(fakturoid_client_id, fakturoid_client_secret);
  const { created_at: invoiced, id, public_html_url } = await fetchInvoice(authHeader, invoiceId);
  for (const key of registrations) {
    console.log({ event: "Marking registration as invoiced", invoiceId, ...key });
    await db.send(
      new UpdateItemCommand({
        TableName: process.env.db_table_registrations,
        Key: marshall(key, { removeUndefinedValues: true, convertEmptyValues: true }),
        UpdateExpression: "SET invoice_id = :invoice_id, invoiced = :invoiced, invoiceUrl = :invoiceUrl",
        ExpressionAttributeValues: marshall({
          ":invoice_id": id,
          ":invoiced": invoiced,
          ":invoiceUrl": public_html_url
        }, {
          removeUndefinedValues: true,
          convertEmptyValues: true
        })
      })
    );
  }
}

/**
 * @param {DynamoDBClient} db
 * @param {{key: { email: string, year: number }, data: Record<string, any>}} params
 */
async function editRegistration(db, { key, data }) {
  console.log({ event: "Update registration", key, data });
  if (key.email === data.email) {
    return db.send(
      new UpdateItemCommand({
        TableName: process.env.db_table_registrations,
        Key: { email: { S: key.email }, year: { N: key.year.toString() } },
        UpdateExpression:
          "SET firstName = :firstName, lastName = :lastName, phone = :phone, company = :company, edited = :now, editedBy = :editedBy, ticketType = :ticketType, paid = :paid,"
          + "invRecipient = :invRecipient, invRecipientEmail = :invRecipientEmail, invRecipientPhone = :invRecipientPhone, invRecipientFirstname = :invRecipientFirstname, invRecipientLastname = :invRecipientLastname,"
          + "invName = :invName, invAddress = :invAddress, invAddressZip = :invAddressZip, invAddressCity = :invAddressCity, invRegNo = :invRegNo, invVatNo = :invVatNo, invText = :invText, invEmail = :invEmail",
        ExpressionAttributeValues: marshall({
          ":firstName": data.firstName,
          ":lastName": data.lastName,
          ":company": data.company,
          ":now": new Date().toISOString(),
          ":editedBy": data.editedBy,
          ":ticketType": data.ticketType,
          ":phone": data.phone,
          ":paid": data.paid ?? null,
          ":invRecipient": data.invRecipientEmail ? 1 : 0,
          ":invRecipientEmail": data.invRecipientEmail,
          ":invRecipientPhone": data.invRecipientPhone,
          ":invRecipientFirstname": data.invRecipientFirstname,
          ":invRecipientLastname": data.invRecipientLastname,
          ":invName": data.invName,
          ":invAddress": data.invAddress,
          ":invAddressZip": data.invAddressZip,
          ":invAddressCity": data.invAddressCity,
          ":invRegNo": data.invRegNo,
          ":invVatNo": data.invVatNo,
          ":invText": data.invText,
          ":invEmail": data.invEmail
        }, { removeUndefinedValues: true, convertEmptyValues: true })
      })
    );
  }

  const originalData = await getRegistration(db, key);
  const formData = marshall(Object.assign(data, { year: parseInt(data.year) }), {
    convertEmptyValues: true,
    removeUndefinedValues: true
  });

  console.log({
    event: "Update registration with new email - deleting old item and adding new one",
    key,
    originalData,
    formData
  });

  return db.send(
    new TransactWriteItemsCommand({
      TransactItems: [{
        Put: {
          TableName: process.env.db_table_registrations,
          Item: Object.assign({}, originalData, formData)
        }
      }, {
        Delete: {
          TableName: process.env.db_table_registrations,
          Key: { email: { S: key.email }, year: { N: key.year.toString() } }
        }
      }]
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {{registration: {email: string, year: number}, attendee: {slackID: string, year: number}, admin: string}} params
 */
async function transferRegistration(db, params) {
  const { db_table_attendees, db_table_registrations, start_date, end_date, postmark_token } = process.env;
  console.log({ event: "Transfer registration", ...params });
  const registration = await getRegistration(db, params.registration);
  const attendee = await getAttendee(db, params.attendee);
  await db.send(
    new TransactWriteItemsCommand({
      TransactItems: [{
        Put: {
          TableName: db_table_registrations,
          Item: Object.assign({}, registration, {
            invoice_id: attendee.invoice_id,
            invoiced: attendee.invoiced,
            paid: attendee.paid
          })
        }
      }, {
        Put: {
          TableName: db_table_attendees,
          Item: Object.assign({}, attendee, {
            transferred: { S: new Date().toISOString() },
            transferredBy: { S: params.admin }
          })
        }
      }]
    })
  );
  await sendEmailWithTemplate({
    token: postmark_token,
    templateId: Template.RegistrationTransferred,
    data: {},
    to: registration.email.S,
    attachments: [Attachments.calendarInvite(start_date, end_date)],
    tag: "registration-transferred"
  });
  console.log({ event: "Registration transferred", invoiceId: attendee.invoice_id.N, ...params.registration });
}

/**
 * @param {DynamoDBClient} db
 * @param {{command: string, params: *}} data
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
    case "move-to-trash":
      await moveToTrash(db, data.params);
      break;
    case "add":
      await addRegistration(db, data.params);
      break;
    case "transfer":
      await transferRegistration(db, data.params);
      break;
  }
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const data = readPayload(event);
  await processRequest(db, data);
  if (getHeader(event.headers, "Accept") === "application/json") {
    return accepted();
  }
  return seeOther(getHeader(event.headers, "Referer"));
}
