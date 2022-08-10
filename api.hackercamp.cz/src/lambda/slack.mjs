import { fetch } from "@adobe/helix-fetch";

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
  return [actions[a], actions[Math.max(b, 0)]];
}

function getTravel(travel) {
  switch (travel) {
    case "carpool":
      return [
        "A potřebuje na camp hodit. Máš místo v autě? Domluvíte se v kanále #spolujizda?",
      ];
    case "free-car":
      return [
        "A navíc má místo v autě a nabízí odvoz! Domluvíte se v kanále #spolujizda?",
      ];
    default:
      return [];
  }
}

export async function sendMessageToSlack(profile) {
  const resp = await fetch(process.env.slack_announcement_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: [`Hey! <@${profile.slackID}> s námi letos jede na camp.`]
              .concat(getTravel(profile.travel))
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

export async function postChatMessage(channel, message) {
  const resp = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.slack_bot_token}`,
    },
    body: JSON.stringify({
      channel,
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: message },
        },
      ],
    }),
  });
  return resp.text();
}
