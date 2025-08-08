import { iCal } from "@hackercamp/lib/calendar.js";

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ env }) {
  return new Response(iCal(env.HC_START_DATE, env.HC_END_DATE), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": "attachment; filename=hackercamp.ics"
    }
  });
}
