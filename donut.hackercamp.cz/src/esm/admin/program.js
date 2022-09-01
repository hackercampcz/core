import { Endpoint, executeCommand } from "./common.js";

/**
 * @param {string} event_id
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function approve(event_id, apiHost) {
  return executeCommand(apiHost, Endpoint.program, "approve", {
    event_id,
    year: 2022,
  }).then(() => location.reload());
}

/**
 * @param {string} event_id
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function remove(event_id, people, apiHost) {
  return executeCommand(apiHost, Endpoint.program, "delete", {
    event_id,
    people,
    year: 2022,
  }).then(() => location.reload());
}

/**
 * @param {string} event_id
 * @param {string} apiHost
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export function edit(event_id, apiHost, updates) {
  return executeCommand(apiHost, Endpoint.program, "edit", {
    event_id,
    year: 2022,
    ...updates,
  }).then(() => location.reload());
}
