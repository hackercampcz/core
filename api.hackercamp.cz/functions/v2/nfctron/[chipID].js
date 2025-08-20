const userAgent = "HackerCamp Donut (team@hackercamp.cz)";

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ params }) {
  const { chipID } = params;
  const resp = await fetch(`https://api.nfctron.com/receipt/v2/${chipID}/transaction`, {
    headers: {
      accept: "application/json",
      "user-agent": userAgent
    },
    referrer: "https://pass.nfctron.com/"
  });
  const data = await resp.json();
  return Response.json(data);
}
