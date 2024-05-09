import { parse } from "https://deno.land/std/flags/mod.ts";
import { partition } from "https://esm.sh/@thi.ng/transducers";
import { sendEmailsWithTemplate, Template } from "./lib/postmark.js";

async function main({ token }) {
  const emails = [
    "buchnerova.jana@gmail.com",
    "ondcej@gmail.com",
  ];
  console.log(`Found ${emails.length} contacts`);
  for (const batch of partition(500, true, emails)) {
    const resp = await sendEmailsWithTemplate({
      token,
      emails: batch,
      templateId: Template.VolunteerInvitation,
      tag: "volunteer-invitation",
    });
    for (const item of resp) {
      if (item.ErrorCode) console.error(item);
      else console.log(`✅ ${item.To}`);
    }
  }
  console.log("DONE");
}

await main(parse(Deno.args));

// deno run --allow-net=api.postmarkapp.com email-volunteer-invitation.js --token=$(op read "op://HackerCamp/Postmark/credential")
