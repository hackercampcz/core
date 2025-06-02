import { parseArgs } from "jsr:@std/cli/parse-args";
import { partition } from "https://esm.sh/@thi.ng/transducers";
import { sendEmailsWithTemplate, Template } from "./lib/postmark.js";

async function main({ token }) {
  const emails = ["karolina@apify.com"];
  console.log(`Found ${emails.length} contacts`);
  for (const batch of partition(500, true, emails)) {
    const resp = await sendEmailsWithTemplate({
      token,
      emails: batch,
      templateId: Template.VolunteerInvitation,
      tag: "volunteer-invitation",
      replyTo: "pavla.verflova@hackercamp.cz"
    });
    for (const item of resp) {
      if (item.ErrorCode) console.error(item);
      else console.log(`✅ ${item.To}`);
    }
  }
  console.log("DONE");
}

await main(parseArgs(Deno.args));

// deno run --allow-env --allow-import --allow-net=api.postmarkapp.com email-volunteer-invitation.js --token=$(op read "op://HackerCamp/Postmark/credential")
