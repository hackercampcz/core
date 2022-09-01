import { formatDateTime, formatMoney } from "@hackercamp/lib/format.mjs";
import { sortBy } from "@hackercamp/lib/array.mjs";
import "@material/mwc-drawer/mwc-drawer.js";
import "@material/mwc-icon-button/mwc-icon-button.js";
import "@material/mwc-list/mwc-list-item.js";
import "@material/mwc-list/mwc-list.js";
import { defAtom } from "@thi.ng/atom";
import { html } from "lit-html";
import { classMap } from "lit-html/directives/class-map.js";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { until } from "lit-html/directives/until.js";
import { when } from "lit-html/directives/when.js";
import * as marked from "marked";
import { Endpoint, unauthorized, View } from "./admin/common.js";
import {
  createOptIn,
  createOptOut,
  markAsInvoiced,
} from "./admin/registrations.js";
import * as event from "./admin/program.js";
import { housing, ticketBadge, travel } from "./lib/attendee.js";
import { getContact, getSlackProfile } from "./lib/profile.js";
import { initRenderLoop } from "./lib/renderer.js";
import * as rollbar from "./lib/rollbar.js";
import { renderEventForm } from "./event-form.js";
import { showModalDialog } from "./modal-dialog.js";

const state = defAtom({
  selectedView: View.paid,
  view: renderView,
  apiHost: null,
  campStartAt: new Date("2022-09-01T14:00:00"),
  campEndAt: new Date("2022-09-04T14:00:00"),
});

const transact = (fn) => state.swap(fn);

function optout(email) {
  const { apiHost } = state.deref();
  return (
    confirm("Opravdu chceš táborníka vyřadit?") && createOptOut(email, apiHost)
  );
}

function optin(email) {
  const { apiHost, contact } = state.deref();
  return (
    confirm("Opravdu chceš táborníka potvrdit?") &&
    createOptIn(email, contact.slackID, apiHost)
  );
}

function invoiced(email) {
  const { apiHost } = state.deref();
  const invoiceId = prompt("Zadej ID faktury");
  return markAsInvoiced([email], invoiceId, apiHost);
}

function deleteEvent(event_id, people) {
  const { apiHost } = state.deref();
  return (
    confirm("Opravdu chceš event smazat?") &&
    event.remove(event_id, people, apiHost)
  );
}

function approveEvent(event_id) {
  const { apiHost } = state.deref();
  return (
    confirm("Opravdu chceš event schválit?") && event.approve(event_id, apiHost)
  );
}

function chip({ text, count, selected, view }) {
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
        href="?view=${view}"
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
          >${text}
          ${until(
            count?.then((x) => html`<data value="${x}">${x}</data>`, "")
          )}</span
        >
      </a>
    </span>
  `;
}

function registrationsChips(
  view,
  { hackers, waitingList, confirmed, invoiced, paid, optouts }
) {
  return html`
    <div
      class="mdc-evolution-chip-set"
      role="grid"
      id="filters"
      aria-orientation="horizontal"
      aria-multiselectable="false"
    >
      <span class="mdc-evolution-chip-set__chips" role="presentation">
        ${chip({
          text: "Zaplacení",
          count: paid,
          selected: view === View.paid,
          view: View.paid,
        })}
        ${chip({
          text: "Vyfakturovaní",
          count: invoiced,
          selected: view === View.invoiced,
          view: View.invoiced,
        })}
        ${chip({
          text: "Potvrzení",
          count: confirmed,
          selected: view === View.confirmed,
          view: View.confirmed,
        })}
        ${chip({
          text: "Nepotvrzení",
          count: hackers,
          selected: view === View.hackers,
          view: View.hackers,
        })}
        ${chip({
          text: "Waiting list",
          count: waitingList,
          selected: view === View.waitingList,
          view: View.waitingList,
        })}
        ${chip({
          text: "Opt-outs",
          count: optouts,
          selected: view === View.optouts,
          view: View.optouts,
        })}
      </span>
    </div>
  `;
}

function attendeesChips(
  view,
  {
    attendees,
    crewAttendees,
    staffAttendees,
    volunteerAttendees,
    hackerAttendees,
  }
) {
  return html`
    <div
      class="mdc-evolution-chip-set"
      role="grid"
      id="filters"
      aria-orientation="horizontal"
      aria-multiselectable="false"
    >
      <span class="mdc-evolution-chip-set__chips" role="presentation">
        ${chip({
          text: "Všichni",
          count: attendees,
          selected: view === View.attendees,
          view: View.attendees,
        })}
        ${chip({
          text: "Hackeři",
          count: hackerAttendees,
          selected: view === View.hackerAttendees,
          view: View.hackerAttendees,
        })}
        ${chip({
          text: "Dobrovolníci",
          count: volunteerAttendees,
          selected: view === View.volunteerAttendees,
          view: View.volunteerAttendees,
        })}
        ${chip({
          text: "Ostatní",
          count: staffAttendees,
          selected: view === View.staffAttendees,
          view: View.staffAttendees,
        })}
        ${chip({
          text: "Crew",
          count: crewAttendees,
          selected: view === View.crewAttendees,
          view: View.crewAttendees,
        })}
      </span>
    </div>
  `;
}

function programChips(view, { program, programApproval }) {
  return html`
    <div
      class="mdc-evolution-chip-set"
      role="grid"
      id="filters"
      aria-orientation="horizontal"
      aria-multiselectable="false"
    >
      <span class="mdc-evolution-chip-set__chips" role="presentation">
        ${chip({
          text: "Schváleno",
          count: program,
          selected: view === View.program,
          view: View.program,
        })}
        ${chip({
          text: "Ke schválení",
          count: programApproval,
          selected: view === View.programApproval,
          view: View.programApproval,
        })}
      </span>
    </div>
  `;
}

const ticketName = new Map([
  ["nonprofit", "Táborník z neziskovky"],
  ["hacker", "Hacker"],
  ["hacker-plus", "Hacker filantrop"],
  ["hacker-patron", "Patron Campu"],
  ["volunteer", "Dobrovolník"],
  ["crew", "Crew"],
  ["staff", "Ostatní"],
]);

const ticketPrice = new Map([
  ["nonprofit", 2500],
  ["hacker", 5000],
  ["hacker-plus", 7500],
  ["hacker-patron", 7500],
  ["volunteer", 0],
  ["crew", 0],
  ["staff", 0],
]);

function ticketDetail({ ticketType, patronAllowance }) {
  const allowance = patronAllowance ? parseInt(patronAllowance) : 0;
  const price = ticketPrice.get(ticketType) + allowance;
  return html`
    <p>
      Lístek: <strong>${ticketName.get(ticketType)}</strong>
      <data value="${price} CZK"><code>${formatMoney(price)} Kč</code></data>
    </p>
  `;
}

function registrationDetailTemplate({ detail, selectedView }) {
  if (!detail) return null;
  return html`
    <div class="hc-card hc-master-detail__detail"">
      <h2 style="display: flex;align-items: center;gap: 12px;">
        <span>${detail.firstName}&nbsp;${detail.lastName}</span>
        ${ticketBadge.get(detail.ticketType)}</h2>
      <p>${detail.company}</p>
      <div class="hc-detail__tools">
        <a
          class="hc-action-button"
          href="mailto:${detail.email}"
          title="Napsat ${detail.email}""><svg
        xmlns="http://www.w3.org/2000/svg"
        height="24"
        width="24"
      >
        <path d="M0 0h24v24H0z" fill="none"/>
        <path
          fill="var(--hc-text-color)"
          d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"
        />
      </svg></a>
        ${when(
          detail.phone,
          () => html`
            <a
              class="hc-action-button"
              href="tel:${detail.phone.replace(" ", "")}"
              title="Zavolat ${detail.phone}"
              ><svg xmlns="http://www.w3.org/2000/svg" height="24" width="24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path
                  fill="var(--hc-text-color)"
                  d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
                /></svg
            ></a>
          `
        )}
        ${when(
          selectedView !== View.paid,
          () => html`
            <button
              class="hc-action-button"
              title="Opt out"
              @click="${() => optout(detail.email)}"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 0 24 24"
                width="24px"
                fill="var(--hc-text-color)"
              >
                <g><rect fill="none" height="24" width="24" /></g>
                <g>
                  <path
                    d="M14,8c0-2.21-1.79-4-4-4S6,5.79,6,8s1.79,4,4,4S14,10.21,14,8z M17,10v2h6v-2H17z M2,18v2h16v-2c0-2.66-5.33-4-8-4 S2,15.34,2,18z"
                  />
                </g>
              </svg>
            </button>
          `
        )}
        ${when(
          selectedView === View.waitingList,
          () => html`
            <button
              class="hc-action-button"
              title="Opt in"
              @click="${() => optin(detail.email)}"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 0 24 24"
                width="24px"
                fill="var(--hc-text-color)"
              >
                <g><rect fill="none" height="24" width="24" /></g>
                <g>
                  <path
                    d="M13,8c0-2.21-1.79-4-4-4S5,5.79,5,8s1.79,4,4,4S13,10.21,13,8z M15,10v2h3v3h2v-3h3v-2h-3V7h-2v3H15z M1,18v2h16v-2 c0-2.66-5.33-4-8-4S1,15.34,1,18z"
                  />
                </g>
              </svg>
            </button>
          `
        )}
        ${when(
          selectedView === View.confirmed,
          () => html`
            <button
              class="hc-action-button"
              title="Vyfakturováno"
              @click="${() => invoiced(detail.email)}"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 0 24 24"
                width="24px"
                fill="var(--hc-text-color)"
              >
                <rect fill="none" height="24" width="24" />
                <path
                  d="M13.17,4L18,8.83V20H6V4H13.17 M14,2H6C4.9,2,4,2.9,4,4v16c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2V8L14,2L14,2z M15,11h-4v1h3 c0.55,0,1,0.45,1,1v3c0,0.55-0.45,1-1,1h-1v1h-2v-1H9v-2h4v-1h-3c-0.55,0-1-0.45-1-1v-3c0-0.55,0.45-1,1-1h1V8h2v1h2V11z"
                />
              </svg>
            </button>
          `
        )}
      </div>
    ${ticketDetail(detail)}
      ${when(
        detail.inviter,
        () => html`<p>Pozval ho <strong>${detail.inviter}</strong></p>`
      )}
      <p>Ubytování: <strong>${
        housing.get(detail.housing) ?? "Ještě si nevybral"
      }</strong></p>
      <p>Doprava: <strong>${
        travel.get(detail.travel) ?? "Ještě si nevybral"
      }</strong></p>
      ${when(
        detail.activity,
        () => html`
          <h3>Aktivita</h3>
          ${unsafeHTML(marked.parse(detail.activity))}
          ${when(
            detail.activityCrew,
            () => html`<p>Parťáci: ${detail.activityCrew}</p>`
          )}
          ${when(
            detail.activityPlace,
            () => html`<p>Zázemí: ${detail.activityPlace}</p>`
          )}
        `
      )}
      ${when(
        detail.invRecipient === "1",
        () => html`
          <p>
            Faturovat za něj bude
            <a href="mailto:${detail.invRecipientEmail}"
              >${detail.invRecipientFirstname} ${detail.invRecipientLastname}</a
            >
            <a href="tel:${detail.invRecipientPhone}"
              >${detail.invRecipientPhone}</a
            >
          </p>
        `
      )}
      ${when(
        detail.invAddress,
        () => html`
          <address
            style="border: 1px solid #ddd; padding: 16px; font-size: 14px;"
          >
            <h3>Fakturační údaje</h3>
            <p>${detail.invName}</p>
            <p>${detail.invAddress}</p>
            ${when(
              detail.invEmail || detail["invoice-contact"],
              () => html`
                <p>
                  E-mail:
                  <code>${detail.invEmail ?? detail["invoice-contact"]}</code>
                </p>
              `
            )}
            <p>
              ${when(detail.invRegNo, () => html`IČ: ${detail.invRegNo}`)}
              ${when(detail.invVatNo, () => html`DIČ: ${detail.invVatNo}`)}
            </p>
            ${when(detail.invText, () => html`<p>${detail.invText}</p>`)}
          </address>
        `
      )}
    </div>
  `;
}

const lineupText = new Map([
  ["liorg", "Organizační"],
  ["limain", "Mainframe"],
  ["libase", "Basecamp"],
  ["liback", "Backend"],
  ["lipeep", "Peopleware"],
  ["liwood", "WoodStack"],
  ["lijungle", "Jungle Release"],
  ["liother", "Doprovodné aktivity"],
]);
function lineup(x) {
  return html`<code>${lineupText.get(x)}</code>`;
}

function attendeeDetailTemplate({ detail }) {
  if (!detail) return null;
  return html`
    <div class="hc-card hc-master-detail__detail"">
      <h2 style="display: flex;align-items: center;gap: 12px;">
        <span>${detail.name}</span>
        ${ticketBadge.get(detail.ticketType)}</h2>
      <p>${detail.company}</p>
      <div class="hc-detail__tools">
        <a
          class="hc-action-button"
          href="mailto:${detail.email}"
          title="Napsat ${detail.email}""><svg
        xmlns="http://www.w3.org/2000/svg"
        height="24"
        width="24"
      >
        <path d="M0 0h24v24H0z" fill="none"/>
        <path
          fill="var(--hc-text-color)"
          d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"
        />
      </svg></a>
      </div>
      ${ticketDetail(detail)}
      <p>Ubytování: <strong>${
        housing.get(detail.housing) ?? "Ještě si nevybral"
      }</strong></p>
      <p>Doprava: <strong>${
        travel.get(detail.travel) ?? "Ještě si nevybral"
      }</strong></p>
        ${detail.events?.map(
          (event) => html`
            <div>
              <h3>${event.title}</h3>
              <p>
                <code>${lineup(event.lineup)}</code> -
                <time datetime="${event.startAt}"
                  >${formatDateTime(new Date(event.startAt))}</time
                >
              </p>
            </div>
          `
        )}
    </div>
  `;
}

const renderDetail = (detail) => () =>
  transact((x) => Object.assign(x, { detail }));

function registrationsTableTemplate(data, { timeHeader, timeAttr }) {
  return html`
    <table>
      <thead>
        <tr>
          <th>Jméno</th>
          <th>Společnost</th>
          <th>${timeHeader}</th>
          <th>Akce</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(
          (row) => html`
            <tr
              @click="${renderDetail(row)}">
              <td>${row.name}</td>
              <td>${row.company}</td>
              <td>${
                row[timeAttr] ? formatDateTime(new Date(row[timeAttr])) : ""
              }</td>
              <td>
                <a
                  class="hc-action-button"
                  href="mailto:${row.email}"
                  title="Napsat ${row.email}""><svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24"
                  width="24"
                >
                  <path d="M0 0h24v24H0z" fill="none"/>
                  <path
                    fill="var(--hc-text-color)"
                    d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"
                  />
                </svg></a>
                ${when(
                  row.phone,
                  () => html`
                    <a
                      class="hc-action-button"
                      href="tel:${row.phone.replace(" ", "")}"
                      title="Zavolat ${row.phone}"
                      ><svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="24"
                        width="24"
                      >
                        <path d="M0 0h24v24H0z" fill="none" />
                        <path
                          fill="var(--hc-text-color)"
                          d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
                        /></svg
                    ></a>
                  `
                )}
              </td>
            </tr>
          `
        )}
      </tbody>
    </table>
  `;
}

function attendeesTableTemplate(data) {
  return html`
    <table>
      <thead>
        <tr>
          <th>Jméno</th>
          <th>Společnost</th>
          <th>Typ lístku</th>
          <th>Zaplaceno</th>
          <th>Akce</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(
          (row) => html`
            <tr
              @click="${renderDetail(row)}">
              <td>${row.name}</td>
              <td>${row.company}</td>
              <td>${ticketName.get(row.ticketType)}</td>
              <td>${row.paid ? formatDateTime(new Date(row.paid)) : ""}</td>
              <td>
                <a
                  class="hc-action-button"
                  href="mailto:${row.email}"
                  title="Napsat ${row.email}""><svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24"
                  width="24"
                >
                  <path d="M0 0h24v24H0z" fill="none"/>
                  <path
                    fill="var(--hc-text-color)"
                    d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"
                  />
                </svg></a>
              </td>
            </tr>
          `
        )}
      </tbody>
    </table>
  `;
}

const timeColumn = new Map([
  [View.paid, { timeHeader: "Čas zaplacení", timeAttr: "paid" }],
  [View.attendees, { timeHeader: "Čas zaplacení", timeAttr: "paid" }],
  [View.invoiced, { timeHeader: "Čas fakturace", timeAttr: "invoiced" }],
]);

function registrationsTemplate(state) {
  const { data, selectedView, detail } = state;
  return html`
    <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      ${registrationsChips(selectedView, {
        [selectedView]: data?.then((data) => data.length),
      })}
    </div>
    <div
      class="hc-master-detail mdc-layout-grid__cell mdc-layout-grid__cell--span-12"
    >
      <div class="hc-card hc-master-detail__list">
        ${until(
          data?.then((data) => {
            if (data.unauthorized) return unauthorized();
            const timeColumnSettings = timeColumn.get(selectedView) ?? {
              timeHeader: "Čas registrace",
              timeAttr: "timestamp",
            };
            if (selectedView === View.optouts) {
              return html`
                <ul>
                  ${data.map((x) => html`<li>${x}</li>`)}
                </ul>
              `;
            }
            return registrationsTableTemplate(
              sortBy(
                timeColumnSettings.timeAttr,
                data.map((x) =>
                  Object.assign({}, x, {
                    name: x.name ?? `${x.firstName} ${x.lastName}`,
                  })
                )
              ),
              timeColumnSettings
            );
          }),
          html`
            <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
              <p style="padding: 16px">Načítám data&hellip;</p>
            </div>
          `
        )}
      </div>
      ${when(detail, () =>
        registrationDetailTemplate({ detail, selectedView })
      )}
    </div>
  `;
}

function attendeesTemplate(state) {
  const { data, selectedView, detail } = state;
  return html`
    <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      ${attendeesChips(selectedView, {
        [selectedView]: data?.then((data) => data.length),
      })}
    </div>
    <div
      class="hc-master-detail mdc-layout-grid__cell mdc-layout-grid__cell--span-12"
    >
      <div class="hc-card hc-master-detail__list">
        ${until(
          data?.then((data) => {
            if (data.unauthorized) return unauthorized();
            return attendeesTableTemplate(sortBy("paid", data));
          }),
          html`
            <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
              <p style="padding: 16px">Načítám data&hellip;</p>
            </div>
          `
        )}
      </div>
      ${when(detail, () => attendeeDetailTemplate({ detail }))}
    </div>
  `;
}

function housingTable(data) {
  return html`
    <table style="width: 100%">
      <thead>
        <tr>
          <th>Jméno</th>
          <th>Společnost</th>
          <th>Typ lístku</th>
          <th>Ubytování</th>
          <th>Umístění</th>
          <th>Akce</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(
          (row) => html`
            <tr>
              <td>${row.name}</td>
              <td>${row.company}</td>
              <td>${ticketName.get(row.ticketType)}</td>
              <td>${housing.get(row.housing) ?? "Ještě si nevybral"}</td>
              <td>${row.housingPlacement}</td>
              <td>
                <a
                  class="hc-action-button"
                  href="mailto:${row.email}"
                  title="Napsat ${row.email}""><svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24"
                  width="24"
                >
                  <path d="M0 0h24v24H0z" fill="none"/>
                  <path
                    fill="var(--hc-text-color)"
                    d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"
                  />
                </svg></a>
              </td>
            </tr>
          `
        )}
      </tbody>
    </table>
  `;
}

function housingTemplate(state) {
  const { data } = state;
  return html`
    <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      <div class="hc-card">
        ${until(
          data?.then((data) => {
            if (data.unauthorized) return unauthorized();
            return housingTable(sortBy("housing", data));
          }),
          html`
            <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
              <p style="padding: 16px">Načítám data&hellip;</p>
            </div>
          `
        )}
      </div>
    </div>
  `;
}

function programTableFilter(event) {
  if (event.type === "org") {
    return false;
  }
  return true;
}

function programTable(data) {
  return html`
    <table style="width: 100%;">
      <thead>
        <tr>
          <th>ID</th>
          <th>Jméno</th>
          <th>Typ</th>
          <th>Stage</th>
          <th>Začátek</th>
          <th>Konec</th>
          <th>Akce</th>
        </tr>
      </thead>
      <tbody>
        ${data.filter(programTableFilter).map(
          (row) => html`
            <tr>
              <td><code>${row.id}</code></td>
              <td
                style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis"
              >
                ${row.title}
              </td>
              <td>${row.type}</td>
              <td>${lineup(row.lineup)}</td>
              <td>
                ${row.startAt ? formatDateTime(new Date(row.startAt)) : null}
              </td>
              <td>${row.endAt ? formatDateTime(new Date(row.endAt)) : null}</td>
              <td style="white-space: nowrap;">
                ${when(
                  !row.approved,
                  () => html`
                    <button
                      class="hc-action-button"
                      title="Schválit event"
                      @click="${() => approveEvent(row._id)}"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="24px"
                        viewBox="0 0 24 24"
                        width="24px"
                        fill="var(--hc-text-color)"
                      >
                        <path d="M0 0h24v24H0V0z" fill="none" />
                        <path
                          d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10zM5 7V5h14v2H5zm5.56 10.46l5.93-5.93-1.06-1.06-4.87 4.87-2.11-2.11-1.06 1.06z"
                        />
                      </svg>
                    </button>
                  `
                )}
                <button
                  class="hc-action-button"
                  title="Upravit event"
                  @click=${() => {
                    showEditEventModalDialog(row);
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 0 24 24"
                    width="24px"
                    fill="var(--hc-text-color)"
                  >
                    <path d="M0 0h24v24H0V0z" fill="none" />
                    <path
                      d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"
                    />
                  </svg>
                </button>
                <button
                  class="hc-action-button"
                  title="Smazat event"
                  @click="${() =>
                    deleteEvent(
                      row._id,
                      row.people?.map((x) => x.slackID) ?? []
                    )}"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 0 24 24"
                    width="24px"
                    fill="var(--hc-text-color)"
                  >
                    <path d="M0 0h24v24H0V0z" fill="none" />
                    <path
                      d="M14.12 10.47L12 12.59l-2.13-2.12-1.41 1.41L10.59 14l-2.12 2.12 1.41 1.41L12 15.41l2.12 2.12 1.41-1.41L13.41 14l2.12-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4zM6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9z"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          `
        )}
      </tbody>
    </table>
  `;
}

function programModalDialog() {
  return html`
    <dialog id="program-modal">
      <div id="program-modal-root">nah</div>
      <hr />
      <button name="close" type="reset">Zavřít</button>
    </dialog>
  `;
}

async function showEditEventModalDialog(event) {
  const { campStartAt,campEndAt,  apiHost, data } = state.deref();
  const root = document.getElementById("program-modal-root");

console.log(event)
  renderEventForm(root, {
    apiHost,
    profile: getSlackProfile(),
    lineupId: event.lineup,
    // header,
    campStartAt,
    campEndAt,
    // preferredTime,
    hijackHacker: true,
    events: await data,
    selectedTopic: event.topic,
  });
  showModalDialog("program-modal");
}

function programTemplate(state) {
  const { data, selectedView } = state;
  return html`
    <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      ${programChips(selectedView, {
        [selectedView]: data?.then((data) => data.length),
      })}
    </div>
    <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      <div class="hc-card">
        ${until(
          data?.then((data) => {
            if (data.unauthorized) return unauthorized();
            return [
              programTable(sortBy("startAt", data, { asc: true })),
              programModalDialog(),
            ];
          }),
          html`
            <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
              <p style="padding: 16px">Načítám data&hellip;</p>
            </div>
          `
        )}
      </div>
    </div>
  `;
}

const registrationViews = new Set([
  View.paid,
  View.invoiced,
  View.confirmed,
  View.hackers,
  View.waitingList,
  View.optouts,
]);
const attendeeViews = new Set([
  View.attendees,
  View.hackerAttendees,
  View.staffAttendees,
  View.crewAttendees,
  View.volunteerAttendees,
]);

const programViews = new Set(["program", "programApproval"]);

function renderView(state) {
  const { selectedView } = state;
  if (registrationViews.has(selectedView)) return registrationsTemplate(state);
  if (attendeeViews.has(selectedView)) return attendeesTemplate(state);
  if (programViews.has(selectedView)) return programTemplate(state);
  switch (selectedView) {
    case View.housing:
      return housingTemplate(state);
    default:
      return html`Pohled do neznáma`;
  }
}

const endpointForView = new Map([
  [View.paid, Endpoint.registrations],
  [View.invoiced, Endpoint.registrations],
  [View.confirmed, Endpoint.registrations],
  [View.hackers, Endpoint.registrations],
  [View.optouts, Endpoint.registrations],
  [View.waitingList, Endpoint.registrations],
  [View.attendees, Endpoint.attendees],
  [View.crewAttendees, Endpoint.attendees],
  [View.hackerAttendees, Endpoint.attendees],
  [View.volunteerAttendees, Endpoint.attendees],
  [View.staffAttendees, Endpoint.attendees],
  [View.program, Endpoint.program],
  [View.programApproval, Endpoint.program],
  [View.housing, Endpoint.housing],
]);

async function fetchData(selectedView, apiHost) {
  const params = new URLSearchParams({ type: selectedView });
  const endpoint = endpointForView.get(selectedView);
  const resource = new URL(`admin/${endpoint}?${params}`, apiHost).href;
  const resp = await fetch(resource, { credentials: "include" });
  if (resp.ok) return resp.json();
  return { unauthorized: true };
}

/**
 * @param {URLSearchParams} searchParams
 * @param {string} apiHost
 */
function loadData(searchParams, apiHost) {
  const selectedView = searchParams.get("view") ?? View.paid;
  transact((x) =>
    Object.assign(x, {
      selectedView,
      data: fetchData(selectedView, apiHost),
    })
  );
}

const endpointName = new Map([
  [Endpoint.registrations, "Registrace"],
  [Endpoint.attendees, "Účastníci"],
  [Endpoint.housing, "Ubytování"],
  [Endpoint.program, "Program"],
]);

function changeTitle(viewTitle, searchParams) {
  const view = searchParams.get("view") ?? View.paid;
  const endpoint = endpointForView.get(view);
  viewTitle.textContent = endpointName.get(endpoint);
}

export async function main({ appRoot, searchParams, env, viewTitle }) {
  rollbar.init(env);
  state.swap((x) =>
    Object.assign({}, x, {
      apiHost: env["api-host"],
      contact: getContact(),
    })
  );
  initRenderLoop(state, appRoot, { keepContent: true });
  changeTitle(viewTitle, searchParams);
  loadData(searchParams, env["api-host"]);
  // initAddEventRenderLoop();
}
