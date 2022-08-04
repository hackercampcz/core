import { fetch } from "@adobe/helix-fetch";

const actions = [
  "Znáte se? -> 😈",
  "Chceš se potkat na campu? -> 🙋",
  "Tešíš se? -> 🤩",
  "Dáte drink? -> 🍻",
  "Zapaříte? -> :picklerick:",
  "Prokecáte celý camp? -> 🗣",
  "Hmm, netušíš, co si můžete říct? Zkusíš to na campu prolomit? -> :awkward_monkey_look:",
  "Přijde Ti povědomý/á? Nepleteš se? Tak to na campu rozseknete? -> :cool-doge:",
  "Potřebuješ se seznámit? -> :wave:",
  "Nemůžeš si ho/ji nechat ujít? -> 🥑",
];

function randomIndex(prev) {
  const x = Math.round(actions.length * Math.random()) - 1;
  return x === prev ? randomIndex(prev) : x;
}

function getActions() {
  const a = randomIndex();
  const b = randomIndex(a);
  return [actions[a], actions[b < 0 ? 0 : b]];
}

export async function sendMessageToSlack(profile) {
  const resp = await fetch(process.env.slack_announcement_url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
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
  return resp.json();
}
