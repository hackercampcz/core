import { parse } from "https://deno.land/std@0.181.0/flags/mod.ts";

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

async function sendMessageToSlack(profile) {
  const resp = await fetch(
    "https://hooks.slack.com/services/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",
    {
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
    }
  );
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

async function main({ token }) {
  await sendMessageToSlack({
    slackID: "U0417TG5GPJ",
    name: "Bohdan Bláhovec",
    image: "https://ca.slack-edge.com/T01V4Q0ACQ4-U0417TG5GPJ-bb34e5cea70b-512",
  });
  return;
  // await sendMessageToSlack({
  //   slackID: "U03RRCEUQCX",
  //   name: "Simona Haganová",
  //   image:
  //     "https://avatars.slack-edge.com/2022-08-03/3892425407684_5e3dd7e680df78a11c5f_512.jpg",
  // });
  const users = [
    // "U03SJP5SVTN",
    // "U03S07B11FH",
    // "U03T1N53VUG",
    // "U03SBT9BRCK",
    // "U03T19RUVPS",
    // "U03SBHZ3RB4",
    // "U03SBHA6X8S",
    // "U03SBEHAL2F",
    // "U03T18D9Y5N",
    // "U03RRCEUQCX",
    // "U03RQ1JG7JT",
    // "U03QXVAN0AH",
    // "U03RCGVL4LR",
    // "U03QZJ1578T",
    // "U03QVNFEHKL",
    // "U03QUN2P3A7",
    // "U03R6V1ANM7",
    // "U03QWNJD604",
    // "U03QU6KPR50",
    "U0202S9SB1T",
  ];
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

await main(parse(Deno.args));

// deno run --allow-net=hooks.slack.com slack-webhook-test.js --token xoxb-1990816352820-3333049321349-fYMHvigmiP4ApQur61t3tiOC
