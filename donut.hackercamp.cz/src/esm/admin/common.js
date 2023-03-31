import { html } from "lit-html";
import { setReturnUrl, signOut } from "../lib/profile.js";
import { withAuthHandler } from "../lib/remoting.js";
import { classMap } from "lit-html/directives/class-map.js";
import { until } from "lit-html/directives/until.js";
import { formatMoney } from "@hackercamp/lib/format.mjs";

export async function executeCommand(apiHost, endpoint, command, params) {
  const resource = new URL(`admin/${endpoint}`, apiHost).href;
  const resp = await withAuthHandler(
    fetch(resource, {
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
    }),
    {
      onUnauthenticated() {
        setReturnUrl(location.href);
        return new Promise((resolve, reject) => {
          signOut((path) => new URL(path, apiHost).href);
          reject({ unauthenticated: true });
        });
      },
    }
  );
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

export const ticketName = new Map([
  ["nonprofit", "Táborník z neziskovky"],
  ["hacker", "Hacker"],
  ["hacker-plus", "Hacker filantrop"],
  ["hacker-patron", "Patron Campu"],
  ["volunteer", "Dobrovolník"],
  ["crew", "Crew"],
  ["staff", "Ostatní"],
]);
export const ticketPrice = new Map([
  [
    2022,
    new Map([
      ["nonprofit", 2500],
      ["hacker", 5000],
      ["hacker-plus", 7500],
      ["hacker-patron", 7500],
      ["volunteer", 0],
      ["crew", 0],
      ["staff", 0],
    ]),
  ],
  [
    2023,
    new Map([
      ["nonprofit", 3000],
      ["hacker", 6000],
      ["hacker-plus", 9000],
      ["hacker-patron", 9000],
      ["volunteer", 0],
      ["crew", 0],
      ["staff", 0],
    ]),
  ],
]);

export function chip({ text, count, selected, view, year }) {
  return html`
    <span
      class="${classMap({
        "mdc-evolution-chip": true,
        "mdc-evolution-chip--selectable": true,
        "mdc-evolution-chip--filter": true,
        "hc-chip": true,
        "hc-chip--selected": selected,
      })}"
      role="presentation"
    >
      <a
        class="mdc-evolution-chip__action mdc-evolution-chip__action--primary"
        role="option"
        aria-selected="${selected ? "true" : "false"}"
        tabindex="0"
        href="?${new URLSearchParams({ view, year })}"
      >
        <span
          class="mdc-evolution-chip__ripple mdc-evolution-chip__ripple--primary"
        ></span>
        <span class="mdc-evolution-chip__graphic">
          <span class="mdc-evolution-chip__checkmark">
            <svg
              class="mdc-evolution-chip__checkmark-svg"
              viewBox="-2 -3 30 30"
            >
              <path
                class="mdc-evolution-chip__checkmark-path"
                fill="none"
                stroke="black"
                d="M1.73,12.91 8.1,19.28 22.79,4.59"
              />
            </svg>
          </span>
        </span>
        <span class="mdc-evolution-chip__text-label"
          >${text}${until(
            count?.then((x) => html`<data value="${x}">${x}</data>`, "")
          )}</span
        >
      </a>
    </span>
  `;
}

export function ticketDetail({ year, ticketType, patronAllowance }) {
  const allowance = patronAllowance ? parseInt(patronAllowance) : 0;
  const price = ticketPrice.get(year).get(ticketType) + allowance;
  return html`
    <p>
      Lístek: <strong>${ticketName.get(ticketType)}</strong>
      <data value="${price} CZK"><code>${formatMoney(price)} Kč</code></data>
    </p>
  `;
}

export const lineupText = new Map([
  ["liorg", "Organizační"],
  ["limain", "Mainframe"],
  ["libase", "Basecamp"],
  ["liback", "Backend"],
  ["lipeep", "Peopleware"],
  ["liwood", "WoodStack"],
  ["lijungle", "Jungle Release"],
  ["liother", "Doprovodné aktivity"],
]);

export function lineup(x) {
  return html`<code>${lineupText.get(x)}</code>`;
}
export function paginationNavigation({ page, pages, count, total, params }) {
  const pageSize = 20;
  const offset = page * pageSize;
  const first = offset + 1;
  const last = offset + count;
  function search(p) {
    const temp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(p)) {
      temp.set(k, v);
    }
    return temp;
  }
  return html`
    <div class="hc-pagination">
      <data class="hc-pagination__total" value="${total}"
        >${first}-${last} ze ${total}</data
      >
      <a
        title="První strana"
        href="?${search({ page: 0 })}"
        class="hc-pagination__button"
        ?disabled="${page <= 0}"
        ><span class="material-icons-outlined">first_page</span></a
      >
      <a
        title="Předchozí strana"
        href="?${search({ page: Math.max(page - 1, 0) })}"
        class="hc-pagination__button"
        ?disabled="${page <= 0}"
        ><span class="material-icons-outlined">chevron_left</span></a
      >
      <a
        title="Další strana"
        href="?${search({ page: Math.min(page + 1, pages - 1) })}"
        class="hc-pagination__button"
        ?disabled="${page >= pages - 1}"
        ><span class="material-icons-outlined">chevron_right</span></a
      >
      <a
        title="Poslední strana"
        href="?${search({ page: pages - 1 })}"
        class="hc-pagination__button"
        ?disabled="${page >= pages - 1}"
        ><span class="material-icons-outlined">last_page</span></a
      >
    </div>
  `;
}
