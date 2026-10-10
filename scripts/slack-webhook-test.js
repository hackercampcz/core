import { parseArgs } from "@std/cli/parse-args";

const actions = [
  "Znáte se? → 😈",
  "Chceš se potkat na campu? → 🙋",
  "Tešíš se? → 🤩",
  "Dáte drink? → 🍻",
  "Zapaříte? → :picklerick:",
  "Prokecáte celý camp? → 🗣",
  "Hmm, netušíš, co si můžete říct? Zkusíš to na campu prolomit? → :awkward_monkey_look:",
  "Přijde Ti povědomý/á? Nepleteš se? Tak to na campu rozseknete? → :cool-doge:",
  "Potřebuješ se seznámit? → :wave:",
  "Nemůžeš si ho/ji nechat ujít? → 🥑",
];

function randomIndex(prev) {
  const x = Math.round(actions.length * Math.random()) - 1;
  return x === prev ? randomIndex(prev) : x;
}

function getActions() {
  const a = randomIndex();
  const b = randomIndex(a);
  console.log({ a, b });
  return [actions[a], actions[Math.max(b, 0)]];
}

async function sendMessageToSlack(url, profile) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: [`Hey! <@${profile.slackID}> s námi letos jede na camp.`]
              .concat(getActions())
              .join("\n"),
          },
          accessory: {
            type: "image",
            image_url: profile.image,
            alt_text: profile.name,
          },
        },
      ],
    }),
  });
  return resp.text();
}

export async function postChatMessage(channel, message, token) {
  const resp = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: message,
          },
        },
      ],
    }),
  });
  return resp.json();
}

async function main({ url, token }) {
  console.log({ url, token });
  const resp = await sendMessageToSlack(url, {
    slackID: "U02CUP3D8GK",
    name: "Tomáš Belada",
    image: "https://ca.slack-edge.com/T01V4Q0ACQ4-U02CUP3D8GK-927c26e25abe-512",
  });
  console.log(resp);
  return;
  const users = ["U0202S9SB1T"];
  const message = `Ahoj, táborníku,

Vítej v našem slacku. Začátek září se blíží. Snad se těšíš stejně jako my.

Nastav si, prosím, svou profilovou fotku, ať tě ostatní poznají nejen v kanále #kdo_prijede_na_camp (za 15 min tě tam ohlásíme, tak šup).

Můžeš se připojit k jakémukoliv kanálu, který Tě zajímá. Můžeš sledovat novinky o #program, festivalovém line-upu i nám z org týmu koukat pod ruce. Nebo se můžeš kouknout, kde a jak zapojit své ruce k dílu → #hands_wanted.

Pokud chceš nebo nabízíš spolujízdu na camp, tak tady → #spolujizda. Pokud nabízíš volné místo ve stanu či chatce, tak tu → #spolubydleni. Důležité novinky najdeš v kanále #general.

Máš otázky? Neváhej se na nás obrátit. Help line: team@hackercamp.cz`;
  for (const slackID of users) {
    await postChatMessage(slackID, message, token);
  }
}

await main(parseArgs(process.argv.slice(2)));

// node --permission --allow-net --allow-fs-read=../ slack-webhook-test.js --token $(op read "op://HackerCamp/Slack Bot/credential") --url $(op read "op://HackerCamp/Slack Bot/incomming webhook")
