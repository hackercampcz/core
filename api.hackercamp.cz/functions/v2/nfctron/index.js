const userAgent = "HackerCamp Donut (team@hackercamp.cz)";

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ env }) {
  const { NFCTRON_EVENT_ID: eventId, NFCTRON_BEARER_TOKEN: bearer } = env;
  const resp = await fetch(`https://api.nfctron.com/app/event/${eventId}/customer/chip`, {
    headers: {
      "Authorization": `Bearer ${bearer}`,
      "Accept": "application/json",
      "referer": "https://hub.nfctron.com/",
      "user-agent": userAgent
    },
    referrer: "https://hub.nfctron.com/"
  });
  const data = await resp.json();
  return Response.json(data);
}
