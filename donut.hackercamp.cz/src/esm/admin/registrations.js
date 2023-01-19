import { Endpoint, executeCommand } from "./common.js";

/**
 * @param {string} email
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function createOptOut(email, year, apiHost) {
  return executeCommand(apiHost, Endpoint.registrations, "optout", {
    email,
    year,
  }).then(() => location.reload());
}

/**
 * @param {string} email
 * @param {string} slackID
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function createOptIn(email, year, slackID, apiHost) {
  return executeCommand(apiHost, Endpoint.registrations, "approve", {
    email,
    referral: slackID,
    year,
  }).then(() => location.reload());
}

/**
 * @param {string[]} emails
 * @param {string} invoiceId
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function markAsInvoiced(emails, year, invoiceId, apiHost) {
  return executeCommand(apiHost, Endpoint.registrations, "invoiced", {
    registrations: emails.map((email) => ({ email, year })),
    invoiceId,
  }).then(() => location.reload());
}
