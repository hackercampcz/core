import { parseArgs } from "jsr:@std/cli/parse-args";

export async function postChatMessage(channel, message, token) {
  const resp = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel, blocks: [{ type: "section", text: { type: "mrkdwn", text: message } }] })
  });
  return resp.json();
}

let homelessHackers = [
  "U074FEVJJ4R",
  "U097GS7AE76",
  "U05BDAPNBRP",
  "U03SW8VTUDS",
  "U078ZRXQGES",
  "U0990TJLSE8",
  "U03MF1CRWKV",
  "U0296F8DY2E",
  "U02AM81S4PR",
  "U05LAAQNTKK",
  "U094U6KTHM2",
  "U07JUBJC12M",
  "U03TNAB52K0",
  "U02BLQMP3SB",
  "U03V8RWMD39",
  "U02CUBCTV33",
  "U090C6X0UQ2",
  "U05NPNQBX5M",
  "U07JKRGPJDS",
  "U07C8Q6U05U",
  "U02AV7P2Y30"
];

async function main({ token }) {
  const message = `Ahoj, táborníku,

  Pomalu se nám Hacker camp blíží a u tebe jsme si všimli, že máš vybrané ubytování v chatce,
  ale nemáš zabrané konkrétní místo. A to se pak může stát, že ti tvé vytoužené místo někdo vyfoukne
  nebo že budeš muset spát na louce nebo v Glampingu. ;)

  Zajdi prosím na https://donut.hckr.camp/ubytovani/ a tam si **vyber konkrétní místo** v chatce nebo domečku. :pray:

  Pokud už ti někdo místo, kde jsi chtěl být vyfouknul, nezoufej, dořešíme to na místě, ale někam se prosím ulož,
  ať ostatní vědí, jaké jsou kapacity.

  Děkujeme a přejeme hezký zbytek dne, tvoje @crew`;

  for (const slackID of homelessHackers) {
    const resp = await postChatMessage(slackID, message, token);
    console.log(`${resp.ok ? "✅" : "⚠️"} ${slackID}`);
  }
}

await main(parseArgs(Deno.args));

// deno run --allow-import --allow-net=slack.com slack-homeless-push.js --token $(op read "op://HackerCamp/Slack Bot/credential")
