import { Endpoint, executeCommand } from "./common.js";

/**
 * @param {Object} attendee
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function edit(attendee, apiHost) {
  return executeCommand(apiHost, Endpoint.attendees, "edit", attendee).then(
    () => location.reload()
  );
}
