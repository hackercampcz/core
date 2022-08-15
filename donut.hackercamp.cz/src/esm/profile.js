import { html, render } from "lit-html";
import { ticketBadge } from "./lib/attendee.js";
import * as rollbar from "./lib/rollbar.js";
import { getSlackProfile } from "./lib/slack.js";

const supporters = new Set(["hacker-plus", "hacker-patron"]);
const labels = new Map([
  ["hacker-plus", "Hacker filantrop"],
  ["hacker-patron", "Patron Campu"],
]);

const plural = (nr, [singular, few, more]) =>
  `${nr} ${nr === 1 ? singular : nr < 5 ? few : more}`;

function extendedProfile({ ticketType, patronAllowance }) {
  if (!supporters.has(ticketType)) return null;
  const count = 1 + (patronAllowance ?? 0) / 2500;
  return html`
    <p>
      <strong>${labels.get(ticketType)}</strong> - podporuje
      ${plural(count, ["hackera", "hackery", "hackerů"])} z nezisku.
    </p>
  `;
}

export async function main({ attendee, env }) {
  rollbar.init(env);
  const name = document.querySelector("h1");
  render(ticketBadge.get(attendee.ticketType), name);

  const profile = document.querySelector(".hc-profile");
  render(extendedProfile(attendee), profile);
}
