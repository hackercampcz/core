import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";

const slug = "hackercampcrew";
const email = "invoices@hackercamp.cz";
const userAgent = "HackerCamp Donut (team@hackercamp.cz)";
// {
//   "id": 9,
//   "custom_id": null,
//   "proforma": false,
//   "number": "2012-0004",
//   "number_format_id": 1,
//   "variable_symbol": "20120004",
//   "your_name": "Alexandr Hejsek",
//   "your_street": "Hopsinková 14",
//   "your_street2": null,
//   "your_city": "Praha",
//   "your_zip": "10000",
//   "your_country": "CZ",
//   "your_registration_no": "87654321",
//   "your_vat_no": "CZ87654321",
//   "client_name": "Microsoft a. s.",
//   "client_street": "Trojanova 1216/46",
//   "client_street2": null,
//   "client_city": "Praha",
//   "client_zip": "11000",
//   "client_country": "CZ",
//   "client_registration_no": "28444501",
//   "client_vat_no": "CZ28444501",
//   "subject_id": 4,
//   "generator_id": 4,
//   "paypal": false,
//   "gopay": false,
//   "token": "udDTG8Q88M",
//   "status": "paid",
//   "issued_on": "2011-10-13",
//   "taxable_fulfillment_due": "2011-10-13",
//   "due": 10,
//   "due_on": "2011-10-23",
//   "tags": [
//     "Vývoj",
//     "PPC",
//     "Ostatní služby"
//   ],
//   "bank_account": "1234/1234",
//   "payment_method": "bank",
//   "currency": "CZK",
//   "exchange_rate": "1.0",
//   "language": "cz",
//   "transferred_tax_liability": false,
//   "vat_price_mode": "without_vat",
//   "subtotal": "40000.0",
//   "total": "48400.0",
//   "native_subtotal": "40000.0",
//   "native_total": "48400.0",
//   "lines": [
//     {
//       "id": 1234,
//       "name": "PC",
//       "quantity": "1.0",
//       "unit_name": "",
//       "unit_price": "20000.0",
//       "vat_rate": 21,
//       "unit_price_without_vat": "20000.0",
//       "unit_price_with_vat": "24200.0"
//     },
//     {
//       "id": 1235,
//       "name": "Notebook",
//       "quantity": "1.0",
//       "unit_name": "",
//       "unit_price": "20000.0",
//       "vat_rate": 21,
//       "unit_price_without_vat": "20000.0",
//       "unit_price_with_vat": "24200.0"
//     }
//   ],
// }
export async function createInvoice(data, token) {
  const basic = btoa(`${email}:${token}`);
  const resp = await fetch(
    `https://app.fakturoid.cz/api/v2/accounts/${slug}/invoices.json`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      },
      body: JSON.stringify(data),
    }
  );
  return resp.json();
}

// {
//   "name": "MICROSOFT s.r.o.",
//   "country": "CZ",
//   "registration_no": "47123737",
//   "vat_no": "CZ47123737",
//   "email": "",
// }
export async function createSubject(data, token) {
  const basic = btoa(`${email}:${token}`);
  console.log({ data, token, basic });
  const resp = await fetch(
    `https://app.fakturoid.cz/api/v2/accounts/${slug}/subjects.json`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      },
      body: JSON.stringify(data),
    }
  );
  return resp.json();
}

export async function fetchInvoice(token, invoiceId) {
  const basic = btoa(`${email}:${token}`);
  const resp = await fetch(
    `https://app.fakturoid.cz/api/v2/accounts/${slug}/invoices/${invoiceId}.json`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      },
    }
  );
  if (!resp.ok) {
    throw new Error(resp.statusText);
  }
  return resp.json();
}

async function main({ token, invoiceId }) {
  try {
    console.log(await fetchInvoice(token, invoiceId));
  } catch (err) {
    console.error(err);
  }
}

await main(parse(Deno.args));
