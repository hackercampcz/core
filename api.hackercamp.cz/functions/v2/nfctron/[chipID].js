const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0";

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
  console.log(Object.fromEntries(resp.headers.entries()));
  const data = resp.json();
  return Response.json(data);
}
