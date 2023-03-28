import {
  chip,
  Endpoint,
  executeCommand,
  ticketDetail,
  ticketName,
  unauthorized,
  View,
} from "./admin/common.js";
import { html } from "lit-html";
import { formatDateTime } from "@hackercamp/lib/format.mjs";
import { housing, ticketBadge, travel } from "./lib/attendee.js";
import { showModalDialog } from "./modal-dialog.js";
import { when } from "lit-html/directives/when.js";
import { until } from "lit-html/directives/until.js";
import { sortBy } from "@hackercamp/lib/array.mjs";
import { lineup } from "./admin-program.js";

/**
 * @param {Object} attendee
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function edit(attendee, apiHost) {
  return executeCommand(apiHost, Endpoint.attendees, "edit", attendee).then(
    () => location.reload()
  );
}

export function attendeesChips(
  view,
  year,
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
          year,
        })}
        ${chip({
          text: "Hackeři",
          count: hackerAttendees,
          selected: view === View.hackerAttendees,
          view: View.hackerAttendees,
          year,
        })}
        ${chip({
          text: "Dobrovolníci",
          count: volunteerAttendees,
          selected: view === View.volunteerAttendees,
          view: View.volunteerAttendees,
          year,
        })}
        ${chip({
          text: "Ostatní",
          count: staffAttendees,
          selected: view === View.staffAttendees,
          view: View.staffAttendees,
          year,
        })}
        ${chip({
          text: "Crew",
          count: crewAttendees,
          selected: view === View.crewAttendees,
          view: View.crewAttendees,
          year,
        })}
      </span>
    </div>
  `;
}

export function attendeesTableTemplate(data, { renderDetail }) {
  return html`
    <table>
      <thead>
        <tr>
          <th>Jméno</th>
          <th>Společnost</th>
          <th>Typ lístku</th>
          <th>Zaplaceno</th>
          <th>NFCtron</th>
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
            <td>${row.nfcTronID}</td>
            <td>
              <a
                class="hc-action-button"
                href="mailto:${row.email}"
                title="Napsat ${row.email}"">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24"
                width="24"
              >
                <path d="M0 0h24v24H0z" fill="none"/>
                <path
                  fill="var(--hc-text-color)"
                  d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"
                />
              </svg>
              </a>
            </td>
          </tr>
        `
        )}
      </tbody>
    </table>
  `;
}

export function attendeeDetailTemplate({ detail }) {
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
        title="Napsat ${detail.email}"">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="24"
        width="24"
      >
        <path d="M0 0h24v24H0z" fill="none"/>
        <path
          fill="var(--hc-text-color)"
          d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"
        />
      </svg>
      </a>
      <button
        class="hc-action-button"
        title="Upravit účastníka"
        @click="${() => showModalDialog("attendee-modal")}">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 0 24 24"
          width="24px"
          fill="var(--hc-text-color)"
        >
          <path d="M0 0h24v24H0V0z" fill="none"/>
          <path
            d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"
          />
        </svg>
      </button>
    </div>
    ${ticketDetail(detail)}
    <p>Ubytování: <strong>${
      housing.get(detail.housing) ?? "Ještě si nevybral"
    }</strong> ${when(
    detail.housingPlacement,
    () => html` - <em>${detail.housingPlacement}</em>`
  )}</p>
    <p>Doprava: <strong>${
      travel.get(detail.travel) ?? "Ještě si nevybral"
    }</strong></p>
    ${when(
      detail.nfcTronID,
      () => html`<p>NFCtron ID: <code>${detail.nfcTronID}</code></p>`
    )}
    ${when(detail.note, () => html`<p>${detail.note}</p>`)}
    ${when(
      detail.events?.length,
      () => html`
        <h3>Program</h3>
        ${detail.events?.map(
          (event) => html`
            <div
              style="border: 1px solid var(--hc-text-color); padding: 8px 16px"
            >
              <h4>${event.title}</h4>
              <p>
                <code>${lineup(event.lineup)}</code>
                ${when(event.topic, () => html`<code>${event.topic}</code>`)}
                ${when(
                  event.startAt,
                  () => html`-
                    <time datetime="${event.startAt}"
                      >${formatDateTime(new Date(event.startAt))}
                    </time>`
                )}
              </p>
              ${when(
                event.description,
                () => html`<p>${event.description}</p>`
              )}
            </div>
          `
        )}
      `
    )}
    </div>
  `;
}

export function attendeesTemplate(state, actions) {
  const { data, selectedView, detail, apiHost, year } = state;
  const apiURL = (resource) => new URL(resource, apiHost).href;
  const onSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    await attendees.edit(Object.fromEntries(form.entries()), apiHost);
  };
  return html`
    <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      ${attendeesChips(selectedView, year, {
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
            return attendeesTableTemplate(sortBy("paid", data), actions);
          }),
          html`
            <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
              <p style="padding: 16px">Načítám data&hellip;</p>
            </div>
          `
        )}
      </div>
      ${when(detail, () => [
        attendeeDetailTemplate({ detail }),
        attendeeModalDialog({ detail, onSubmit, apiURL }),
      ])}
    </div>
  `;
}

function attendeeModalDialog({ detail, onSubmit, apiURL }) {
  return html`
    <dialog id="attendee-modal">
      <div id="attendee-modal-root">
        <form
          method="post"
          @submit="${onSubmit}"
          action="${apiURL("admin/program")}"
        >
          <input type="hidden" name="year" value="${detail.year}" />
          <input type="hidden" name="slackID" value="${detail.slackID}" />
          <div class="field">
            <label for="note">Poznámka</label>
            <input id="note" name="note" value="${detail.note}" />
          </div>
          <div class="field">
            <label for="nfc-tron-id">NFCtron ID</label>
            <input
              id="nfc-tron-id"
              name="nfcTronID"
              value="${detail.nfcTronID}"
            />
          </div>
          <button type="submit" class="hc-button">Odeslat to</button>
        </form>
      </div>
      <hr />
      <button name="close" type="reset">Zavřít</button>
    </dialog>
  `;
}
