import { parseArgs } from "@std/cli/parse-args";
import { sendEmailWithTemplate, Template } from "./lib/postmark.js";

async function main({ token }) {
  const emails = ["vojtech.matousek@carldatacompany.com"];
  for (const email of emails) {
    const resp = await sendEmailWithTemplate({
      token,
      to: email,
      tag: "registration",
      templateId: Template.NewRegistration,
      data: {}
    });
    if (resp.ErrorCode) console.error(resp);
    else console.log(`✅ ${resp.To}`);
  }
  console.log("DONE");
}

await main(parseArgs(process.argv.slice(2)));

// node --permission --allow-net --allow-fs-read=../ email-generic.js --token=$(op read "op://HackerCamp/Postmark/credential")
