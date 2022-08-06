import { render } from "lit-html";
import { ticketBadge } from "./lib/attendee.js";
import * as rollbar from "./lib/rollbar.js";

export async function main({ attendee, env }) {
  rollbar.init(env);
  const name = document.querySelector("h1");
  render(ticketBadge.get(attendee.ticketType), name);
}
