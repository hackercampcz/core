import { parse } from "https://deno.land/std/flags/mod.ts";
import { createClient } from "https://denopkg.com/chiefbiiko/dynamodb/mod.ts";
import { selectKeys } from "../lib/object.js";
import { attributes, mapper } from "../lib/attendee.js";

const dynamo = createClient();

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

async function getCrewMembers(token) {
  console.log("Loading crew members…");
  const params = new URLSearchParams({ usergroup: "S03EQ1LLYCC" });
  const resp = await fetch(`https://slack.com/api/usergroups.users.list?${params}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const { users } = await resp.json();
  console.log(`Found ${users.length} crew members`);
  return users;
}

async function getUserProfile(token, user) {
  console.log(`Loading user profile for ${user}…`);
  const params = new URLSearchParams({ user });
  const resp = await fetch(`https://slack.com/api/users.info?${params}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return resp.json();
}

async function sendMessageToSlackV2(token, profile) {
  const resp = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel: "C026KB0G8V8",
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

async function getContact(email, slackID) {
  console.log({ event: "Get contact", email, slackID });
  const res = await dynamo.getItem({
    TableName: "contacts",
    Key: { email, slackID },
  });
  return res.Item;
}

async function getAttendee(slackID, year) {
  console.log({ event: "Get attendee", year, slackID });
  const res = await dynamo.getItem({
    TableName: "attendees",
    Key: { year, slackID },
  });
  return res.Item;
}

function createAttendee(contact, record) {
  console.log({ event: "Create attendee", contact, record });
  return dynamo.putItem({
    TableName: "attendees",
    Item:
      Object.assign(
        {},
        selectKeys(contact, new Set(["slackID", "name", "image", "slug"])),
        selectKeys(record, attributes, mapper)
      )
  });
}

async function main({ year, token }) {
  year = Number.parseInt(year)
  console.log({ token });
  const users = await getCrewMembers(token);
  for (const slackID of users) {
    const { user: { profile } } = await getUserProfile(token, slackID);
    const contact = await getContact(profile.email, slackID);
    const attendee = await getAttendee(slackID, year - 1);
    const { ok, channel, ts, ...rest } = await sendMessageToSlackV2(token, contact);
    if (!ok) {
      console.log({ event: "Failed to send message", slackID, ...rest });
      break;
    }
    await createAttendee(contact, Object.assign({}, attendee, {
      year,
      ticketType: "crew",
      announcement: { channel, ts },
      edited: new Date().toISOString(),
      editedBy: "ales@roubicek.name",
      note: "",
    }));
  }
}

await main(parse(Deno.args));

// AWS_PROFILE=hackercamp deno run --allow-import  --allow-env --allow-net --allow-read=$HOME/.aws/credentials,$HOME/.aws/config crew-tickets.js --token $(op read "op://HackerCamp/Slack Bot/credential") --year 2025
