import { Endpoint, executeCommand } from "./common.js";

/**
 * @param {string} event_id
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function deleteEvent(event_id, apiHost) {
  return executeCommand(apiHost, Endpoint.program, "delete", {
    event_id,
    year: 2022,
  }).then(() => location.reload());
}
