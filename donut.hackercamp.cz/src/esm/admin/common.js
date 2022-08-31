import { html } from "lit-html";
import { setReturnUrl } from "../lib/profile.js";

export async function executeCommand(apiHost, endpoint, command, params) {
  const resource = new URL(`admin/${endpoint}`, apiHost).href;
  const resp = await fetch(resource, {
    method: "POST",
    headers: [
      ["Accept", "application/json"],
      ["Content-Type", "application/json"],
    ],
    body: JSON.stringify({
      command: command,
      params: params,
    }),
    credentials: "include",
    referrerPolicy: "no-referrer",
  });
  if (!resp.ok) throw new Error(resp.status);
}

export const View = {
  paid: "paid",
  invoiced: "invoiced",
  confirmed: "confirmed",
  hackers: "hackers",
  waitingList: "waitingList",
  optouts: "optouts",
  attendees: "attendees",
  hackerAttendees: "hackerAttendees",
  staffAttendees: "staffAttendees",
  crewAttendees: "crewAttendees",
  volunteerAttendees: "volunteerAttendees",
  housing: "housing",
  program: "program",
  programApproval: "programApproval",
};

export const Endpoint = {
  registrations: "registrations",
  attendees: "attendees",
  housing: "housing",
  program: "program",
};

export function unauthorized() {
  return html`<p style="padding: 16px">
      Nemáte oprávnění pro tuto sekci. Pokud si myslíte, že je mít máte,
      klikněte na následující tlačítko a potvrďte požadovaná oprávnění:
    </p>
    <div style="padding: 16px">
      <a
        href="https://slack.com/oauth/v2/authorize?client_id=1990816352820.3334586910531&scope=users:read,users:write,users.profile:read,users:read.email&user_scope=users.profile:read,users.profile:write,users:read&redirect_uri=https%3A%2F%2F${location.host}%2F"
      >
        <img
          alt="Add to Slack"
          height="40"
          width="139"
          src="https://platform.slack-edge.com/img/add_to_slack.png"
          @click="${() => {
            setReturnUrl(location.href);
          }}"
          srcset="
            https://platform.slack-edge.com/img/add_to_slack.png    1x,
            https://platform.slack-edge.com/img/add_to_slack@2x.png 2x
          "
      /></a>
    </div>`;
}
