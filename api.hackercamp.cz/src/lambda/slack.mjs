import Rollbar from "./rollbar.mjs";

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

export function attendeeAnnouncement({ image, name, slackID, travel }) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [`Hey! <@${slackID}> s námi letos jede na camp.`]
          .concat(getTravel(travel))
          .concat(getActions())
          .join("\n"),
      },
      accessory: {
        type: "image",
        image_url: image,
        alt_text: name,
      },
    },
  ];
}

export function markdownMessage(message) {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: message },
    },
  ];
}

export async function postChatMessage(channel, message) {
  const rollbar = Rollbar.init();
  if (channel.startsWith("hc-")) {
    console.log({
      msg: "synthetic users can't receive slack messages",
      channel,
    });
    return null;
  }
  const token = process.env.slack_bot_token;
  const body = await postMessage(token, channel, markdownMessage(message));
  if (!body.ok) {
    rollbar.error("Slack API error", body);
  }
  return body;
}

export async function postMessage(token, channel, blocks) {
  console.log({ event: "Post message to Slack", channel });
  const resp = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel,
      blocks,
    }),
  });
  return resp.json();
}

export async function getMessage(token, { channel, ts }) {
  console.log({ event: "Get Slack message", channel, ts });
  const params = new URLSearchParams({
    channel,
    latest: ts,
    inclusive: true,
    limit: 1,
  });
  const resp = await fetch(`https://slack.com/api/conversations.history?${params}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const { messages } = await resp.json();
  return messages[0];
}

export async function updateMessage(token, { channel, ts }, section) {
  console.log({ event: "Update Slack message", channel, ts });
  const resp = await fetch(`https://slack.com/api/chat.update`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel, ts, blocks: [section] }),
  });
  return resp.json();
}
