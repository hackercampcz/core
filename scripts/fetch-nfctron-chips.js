import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";

async function main({ token }) {
  const resp = await fetch(
    "https://api.nfctron.com/app/event/80fbdec6-2775-4edd-9dbc-c0e36b615ac2/customer/chip",
    {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        referer: "https://hub.nfctron.com/",
      },
    }
  );
  const data = await resp.json();
  console.log(data.filter((x) => x.vip).length);
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config fetch-nfctron-chips.js --token $(op read 'op://Hacker Camp/NFCTron/credential')
