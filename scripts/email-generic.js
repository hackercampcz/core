import { parse } from "https://deno.land/std/flags/mod.ts";
import { sendEmailWithTemplate, Template } from "./lib/postmark.js";

async function main({ token }) {
  const emails = [
    "vojtech.matousek@carldatacompany.com",
  ];
  for (const email of emails) {
    const resp = await sendEmailWithTemplate({
      token,
      to: email,
      tag: "registration",
      templateId: Template.NewRegistration,
      data: {},
    });
    if (resp.ErrorCode) console.error(resp);
    else console.log(`✅ ${resp.To}`);
  }
  console.log("DONE");
}

await main(parse(Deno.args));

// deno run --allow-import --allow-env --allow-net=api.postmarkapp.com email-generic.js --token=$(op read "op://HackerCamp/Postmark/credential")
