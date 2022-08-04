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

await sendMessageToSlack({
  slackID: "U01UVGVJ5BP",
  name: "Aleš Roubíček",
  image: "https://ca.slack-edge.com/T01V4Q0ACQ4-U01UVGVJ5BP-208c31529c42-512",
});
