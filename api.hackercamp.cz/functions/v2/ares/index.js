import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser();

function getJSONData(ico, data) {
  const entry = data["are:Ares_odpovedi"]["are:Odpoved"]["D:Vypis_OR"];
  if (!entry) {
    throw new Error("Unknown response from MFCR");
  }
  const legal = entry["D:ZAU"];
  const address = legal["D:SI"];
  return {
    ico,
    companyName: legal["D:OF"],
    address: {
      street: address["D:NU"],
      streetNumber: { orientation: address["D:CO"], house: address["D:CD"] },
      town: address["D:NCO"],
      county: address["D:NOK"],
      city: address["D:N"],
      postalCode: address["D:PSC"]
    }
  };
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);
  const ico = params.get("ico");

  if (!ico) {
    return new Response("Missing GET parameter ico", { status: 400 });
  }

  console.log({ method: "GET", params: Object.fromEntries(params) });

  try {
    const resp = await fetch(`https://wwwinfo.mfcr.cz/cgi-bin/ares/darv_or.cgi?${new URLSearchParams({ ico })}`);
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(err);
    }
    const buffer = await resp.arrayBuffer();
    const data = parser.parse(Buffer.from(buffer));
    const result = getJSONData(ico, data);
    return Response.json(result);
  } catch (err) {
    return new Response(err.message, { status: 400 });
  }
}
