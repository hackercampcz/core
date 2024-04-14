import xml from "fast-xml-parser";

const parser = new xml.XMLParser();
const parseXML = (input) => parser.parse(input);

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
      streetNumber: {
        orientation: address["D:CO"],
        house: address["D:CD"],
      },
      town: address["D:NCO"],
      county: address["D:NOK"],
      city: address["D:N"],
      postalCode: address["D:PSC"],
    },
  };
}

// gets company details from ARES XML https://wwwinfo.mfcr.cz/cgi-bin/ares/darv_std.cgi?ico=27074358
export async function getCompanyDetails(ico) {
  if (!ico) {
    throw new Error("Missing GET parameter ico");
  }
  const resp = await fetch(
    `https://wwwinfo.mfcr.cz/cgi-bin/ares/darv_or.cgi?${new URLSearchParams({
      ico,
    })}`,
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(err);
  }
  const buffer = await resp.buffer();
  const data = parseXML(buffer);
  return getJSONData(ico, data);
}
