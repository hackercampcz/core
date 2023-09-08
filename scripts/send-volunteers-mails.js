import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";
import { sendEmailWithTemplate, Template } from "./lib/postmark.js";

async function main({ token }) {
  const contacts = ["zuzkahefer@gmail.com", "michal@fenekpr.cz"];

  console.log(contacts.length);
  for (const email of contacts) {
    await sendEmailWithTemplate({
      token,
      templateId: Template.VolunteerInvitation,
      from: "Hacker Camp Crew <team@hackercamp.cz>",
      replyTo: "Pavla Verflová <paja@hackercamp.cz>",
      to: email,
      data: {},
    });
    console.log(email, "sent");
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=topmonks deno run --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config send-volunteers-mails.js --token=$(op read 'op://Hacker Camp/Postmark/credential')
