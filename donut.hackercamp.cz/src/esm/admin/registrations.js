import { Endpoint, executeCommand } from "./common.js";

/**
 * @param {string} email
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function createOptOut(email, apiHost) {
  return executeCommand(apiHost, Endpoint.registrations, "optout", {
    email,
    year: 2022,
  }).then(() => location.reload());
}

/**
 * @param {string} email
 * @param {string} slackID
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function createOptIn(email, slackID, apiHost) {
  return executeCommand(apiHost, Endpoint.registrations, "approve", {
    email,
    referral: slackID,
    year: 2022,
  }).then(() => location.reload());
}

/**
 * @param {string[]} emails
 * @param {string} invoiceId
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function markAsInvoiced(emails, invoiceId, apiHost) {
  return executeCommand(apiHost, Endpoint.registrations, "invoiced", {
    registrations: emails.map((email) => ({ email, year: 2022 })),
    invoiceId,
  }).then(() => location.reload());
}
