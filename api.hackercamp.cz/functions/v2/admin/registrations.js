import {
  BatchGetItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  TransactWriteItemsCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { fetchInvoice, getAuthHeader } from "@hackercamp/lib/fakturoid.js";
import { partition } from "@thi.ng/transducers";
import { liteClient } from "algoliasearch/lite";
import { acceptsCSV, csv } from "../../lib/csv.js";
import { createDynamoDBClient } from "../../lib/dynamodb.js";
import { Attachments, getTemplateId, sendEmailWithTemplate, Template } from "../../lib/postmark.js";

/** @typedef { import("@aws-sdk/client-dynamodb").DynamoDBClient } DynamoDBClient */

function findDuplicates(arr) {
  return arr.filter((currentValue, currentIndex) => arr.indexOf(currentValue) !== currentIndex);
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {number} year
 */
async function getOptOuts(db, env, year) {
  console.log("Loading opt-outs");
  const res = await db.send(
    new ScanCommand({
      TableName: env.db_table_optouts,
      ProjectionExpression: "email",
      FilterExpression: "#yr = :yr",
      ExpressionAttributeNames: { "#yr": "year" },
      ExpressionAttributeValues: { ":yr": { N: year.toString() } }
    })
  );
  return res.Items.map(x => x.email.S);
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param hits
 * @returns {Promise<Record<string, any>[]>}
 */
async function getItemsFromDB(db, env, hits) {
  if (hits.length === 0) return [];
  const tableName = env.db_table_registrations;
  const result = [];
  const deduplicatedHits = hits.filter((value, index, self) =>
    index === self.findIndex(t => t.email === value.email && t.year === value.year)
  );

  for (const batch of partition(100, true, deduplicatedHits)) {
    const keys = batch.map(({ year, email }) => ({ year: { N: year.toString() }, email: { S: email } }));
    console.log("KEYS TO LOAD", keys);

    const items = await db.send(new BatchGetItemCommand({ RequestItems: { [tableName]: { Keys: keys } } }));
    result.push(
      ...items.Responses[tableName].map(x => unmarshall(x)).sort((a, b) => -1 * a.timestamp?.localeCompare(b.timestamp))
    );
  }
  return result;
}

/**
 * @param {DynamoDBClient} client
 * @param {Env} env
 * @param {string} query
 * @param {string} tag
 * @param {number} year
 * @param {number} page
 * @param {number} pageSize
 * @param {Object} options
 * @param {boolean} options.allYears
 */
async function getRegistrations(client, env, query, tag, year, page, pageSize, { allYears }) {
  const clientSearch = liteClient(env.algolia_app_id, env.algolia_search_key);

  console.log({ event: "Loading registrations", tag, year, page, pageSize, query, allYears });

  const indexPostfix = tag === "invoiced" ? "_invoicedAt_desc" : tag === "paid" ? "_paidAt_desc" : "";
  const indexName = env.algolia_index_name + indexPostfix;

  const { results } = await clientSearch.search({
    requests: [
      {
        indexName,
        query,
        attributesToRetrieve: ["year", "email"],
        tagFilters: [allYears ? null : year.toString(), tag === "search" ? null : tag].filter(Boolean),
        hitsPerPage: pageSize,
        page
      },
      {
        requests: [{
          indexName: env.algolia_index_name,
          query: "",
          tagFilters: [year.toString(), "paid"],
          hitsPerPage: 1
        }]
      },
      {
        requests: [{
          indexName: env.algolia_index_name,
          query: "",
          tagFilters: [year.toString(), "invoiced"],
          hitsPerPage: 1
        }]
      },
      {
        requests: [{
          indexName: env.algolia_index_name,
          query: "",
          tagFilters: [year.toString(), "confirmed"],
          hitsPerPage: 1
        }]
      },
      {
        requests: [{
          indexName: env.algolia_index_name,
          query: "",
          tagFilters: [year.toString(), "waitingList"],
          hitsPerPage: 1
        }]
      },
      {
        requests: [{
          indexName: env.algolia_index_name,
          query: "",
          tagFilters: [year.toString(), "volunteer"],
          hitsPerPage: 1
        }]
      },
      {
        requests: [{
          indexName: env.algolia_index_name,
          query: "",
          tagFilters: [year.toString(), "staff"],
          hitsPerPage: 1
        }]
      }
    ]
  });

  const [{ hits, nbHits, nbPages }, ...counts] = results;
  const [paid, invoiced, confirmed, waitingList, volunteer, staff] = counts.map(x => x.nbHits);

  const duplicates = findDuplicates(hits);
  console.log(hits, duplicates);

  const items = await getItemsFromDB(client, env, hits);
  return {
    items,
    page,
    pages: nbPages,
    total: nbHits,
    counts: { paid, invoiced, confirmed, waitingList, volunteer, staff }
  };
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  console.log({ method: "GET", params: Object.fromEntries(params) });

  const client = createDynamoDBClient(env);
  const year = Number.parseInt(params.get("year") ?? env.year ?? "2022");
  const query = params.get("query") ?? "";
  const page = Number.parseInt(params.get("page") ?? "0");
  const pageSize = Number.parseInt(params.get("pageSize") ?? "20");
  const type = params.get("type");

  const data = (type === "optouts")
    ? await getOptOuts(client, env, year)
    : await getRegistrations(client, env, query, type, year, page, pageSize, {
      allYears: acceptsCSV(request) && !params.has("year")
    });
  if (acceptsCSV(request)) {
    return csv(data, { year, resource: "registrations", type });
  }
  return Response.json(data);
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param email
 * @returns {Promise<unknown>}
 */
async function getContact(db, env, email) {
  console.log({ event: "Get contact", email });
  const res = await db.send(
    new ScanCommand({
      TableName: env.db_table_contacts,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: marshall({ ":email": email }, {
        removeUndefinedValues: true,
        convertEmptyValues: true
      })
    })
  );
  return res.Items.map(x => unmarshall(x))?.[0];
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {{email: string, year: number}} data
 */
async function getAttendee(db, env, { slackID, year }) {
  console.log("Get attendee", { slackID, year });
  const result = await db.send(
    new GetItemCommand({
      TableName: env.db_table_attendees,
      Key: { slackID: { S: slackID }, year: { N: year.toString() } }
    })
  );
  return result.Item;
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {{slackID: string, year: number}} data
 */
async function getRegistration(db, env, { email, year }) {
  console.log("Get registration", { email, year });
  const resp = await db.send(
    new GetItemCommand({
      TableName: env.db_table_registrations,
      Key: { email: { S: email }, year: { N: year.toString() } }
    })
  );
  return resp.Item;
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {{email: string, year: number}} data
 */
async function optout(db, env, { email, year }) {
  return db.send(
    new PutItemCommand({
      TableName: env.db_table_optouts,
      Item: marshall({ email, year }, { convertEmptyValues: true, removeUndefinedValues: true })
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {{email: string, year: number, slackID: string}} data
 */
async function moveToTrash(db, env, { email, year, slackID }) {
  console.log({ event: "Moving registration to trash", email, year });

  const reg = await getRegistration(db, env, { email, year });
  await db.send(
    new PutItemCommand({
      TableName: env.db_table_trash,
      Item: Object.assign({}, reg, {
        deletedBy: { S: slackID },
        deleted: { S: new Date().toISOString() }
      })
    })
  );
  await db.send(
    new DeleteItemCommand({
      TableName: env.db_table_registrations,
      Key: { email: { S: email }, year: { N: year.toString() } }
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {*} data
 */
function addRegistration(db, env, data) {
  console.log({ event: "Put registration", data });

  return db.send(
    new PutItemCommand({
      TableName: env.db_table_registrations,
      Item: marshall({ ...data }, { convertEmptyValues: true, removeUndefinedValues: true })
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {{email: string, year: number, referral: string}} data
 */
async function approve(db, env, { email, year, referral }) {
  console.log({ event: "Approving registration", email, year, referral });
  await db.send(
    new UpdateItemCommand({
      TableName: env.db_table_registrations,
      Key: marshall({ email, year }, { removeUndefinedValues: true, convertEmptyValues: true }),
      UpdateExpression: "SET approved = :approved, approvedBy = :approvedBy",
      ExpressionAttributeValues: marshall({ ":approved": new Date().toISOString(), ":approvedBy": referral })
    })
  );
  return sendEmailWithTemplate({
    token: env.postmark_token,
    templateId: getTemplateId(env, Template.RegistrationApproved),
    data: {},
    to: email,
    tag: "registration-approved"
  });
}

/**
 * @param {Env} env
 * @param {string} email
 * @returns {Promise<void>}
 */
async function sendVolunteerSlackInvitation(env, email) {
  await sendEmailWithTemplate({
    token: env.postmark_token,
    to: email,
    templateId: getTemplateId(env, Template.VolunteerSlackInvite),
    data: {},
    tag: "volunteer-slack-invitation"
  });
  console.log({ event: "Volunteer slack invitation sent", email });
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {{registrations: Array<Record<string, any>>, referral: string}} data
 */
async function approveVolunteer(db, env, { registrations, referral }) {
  for (const registration of registrations) {
    console.log({ event: "Marking volunteer registration as paid", ...registration });
    const { email } = registration;
    const contact = await getContact(db, env, email);
    if (!contact) {
      console.log({ event: "No contact found", email });
      await sendVolunteerSlackInvitation(env, email);
    }

    await db.send(
      new UpdateItemCommand({
        TableName: env.db_table_registrations,
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
 * @param {Env} env
 * @param {{registrations: Array<Record<string, any>>, invoiceId: number}} data
 */
async function invoiced(db, env, { registrations, invoiceId }) {
  const { fakturoid_client_id, fakturoid_client_secret } = env;
  const authHeader = await getAuthHeader(fakturoid_client_id, fakturoid_client_secret);
  const { created_at: invoiced, id, public_html_url } = await fetchInvoice(authHeader, invoiceId);
  for (const key of registrations) {
    console.log({ event: "Marking registration as invoiced", invoiceId, ...key });
    await db.send(
      new UpdateItemCommand({
        TableName: env.db_table_registrations,
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
 * @param {Env} env
 * @param {{key: { email: string, year: number }, data: Record<string, any>}} params
 */
async function markRegistrationAsPaid(db, env, { key, data }) {
  console.log({ event: "Marking registration as paid", key, data });
  // Mark registration as paid, so the creation of attendee is triggered
  await db.send(
    new UpdateItemCommand({
      TableName: env.db_table_registrations,
      Key: marshall(key, { removeUndefinedValues: true, convertEmptyValues: true }),
      UpdateExpression: "SET paid = :paid, editedBy = :editedBy",
      ExpressionAttributeValues: {
        ":paid": { S: new Date().toISOString() },
        ":editedBy": { S: data.editedBy }
      }
    })
  );
  // Revert, so it can be processed (invoiced, paid etc.)
  await db.send(
    new UpdateItemCommand({
      TableName: env.db_table_registrations,
      Key: marshall(key, { removeUndefinedValues: true, convertEmptyValues: true }),
      UpdateExpression: "REMOVE paid",
      ExpressionAttributeValues: {
        ":editedBy": { S: data.editedBy }
      }
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {{key: { email: string, year: number }, data: Record<string, any>}} params
 */
async function editRegistration(db, env, { key, data }) {
  console.log({ event: "Update registration", key, data });
  if (key.email === data.email) {
    return db.send(
      new UpdateItemCommand({
        TableName: env.db_table_registrations,
        Key: { email: { S: key.email }, year: { N: key.year.toString() } },
        UpdateExpression:
          "SET firstName = :firstName, lastName = :lastName, phone = :phone, company = :company, edited = :now, "
          + "editedBy = :editedBy, ticketType = :ticketType, paid = :paid, invRecipient = :invRecipient, "
          + "invRecipientEmail = :invRecipientEmail, invRecipientPhone = :invRecipientPhone, "
          + "invRecipientFirstname = :invRecipientFirstname, invRecipientLastname = :invRecipientLastname,"
          + "invName = :invName, invAddress = :invAddress, invAddressZip = :invAddressZip, "
          + "invAddressCity = :invAddressCity, invRegNo = :invRegNo, invVatNo = :invVatNo, invText = :invText, "
          + "invEmail = :invEmail",
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

  const originalData = await getRegistration(db, env, key);
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
          TableName: env.db_table_registrations,
          Item: Object.assign({}, originalData, formData)
        }
      }, {
        Delete: {
          TableName: env.db_table_registrations,
          Key: { email: { S: key.email }, year: { N: key.year.toString() } }
        }
      }]
    })
  );
}

/**
 * @param {DynamoDBClient} db
 * @param {Env} env
 * @param {{registration: {email: string, year: number}, attendee: {slackID: string, year: number}, admin: string}} params
 */
async function transferRegistration(db, env, params) {
  const { db_table_attendees, db_table_registrations, start_date, end_date, postmark_token } = env;
  console.log({ event: "Transfer registration", ...params });
  const registration = await getRegistration(db, env, params.registration);
  const attendee = await getAttendee(db, env, params.attendee);
  const registrationEmail = registration?.email?.S || registration?.email;
  const attendeeInvoiceId = attendee?.invoice_id?.N || attendee?.invoice_id;

  await db.send(
    new TransactWriteItemsCommand({
      TransactItems: [{
        Put: {
          TableName: db_table_registrations,
          Item: Object.assign({}, unmarshall(registration), {
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
    templateId: getTemplateId(env, Template.RegistrationTransferred),
    data: {},
    to: registrationEmail,
    attachments: [Attachments.calendarInvite(start_date, end_date)],
    tag: "registration-transferred"
  });
  console.log({ event: "Registration transferred", invoiceId: attendeeInvoiceId, ...params.registration });
}

async function processRequest(db, env, data) {
  switch (data.command) {
    case "optout":
      await optout(db, env, data.params);
      break;
    case "approve":
      await approve(db, env, data.params);
      break;
    case "approveVolunteer":
      await approveVolunteer(db, env, data.params);
      break;
    case "invoiced":
      await invoiced(db, env, data.params);
      break;
    case "edit":
      await editRegistration(db, env, data.params);
      break;
    case "move-to-trash":
      await moveToTrash(db, env, data.params);
      break;
    case "add":
      await addRegistration(db, env, data.params);
      break;
    case "transfer":
      await transferRegistration(db, env, data.params);
      break;
    case "paid":
      await markRegistrationAsPaid(db, env, data.params);
      break;
  }
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const client = createDynamoDBClient(env);
  const data = await request.json();
  await processRequest(client, env, data);

  const acceptHeader = request.headers.get("Accept");
  if (acceptHeader === "application/json") {
    return Response.json({ status: "ok" });
  }
  return Response.redirect(request.headers.get("Referer") || "/", 303);
}
