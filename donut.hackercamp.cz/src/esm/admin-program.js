import { chip, lineup, unauthorized, View } from "./admin/common.js";
import { html } from "lit-html";
import { when } from "lit-html/directives/when.js";
import { formatDateTime } from "@hackercamp/lib/format.mjs";
import { until } from "lit-html/directives/until.js";
import { sortBy } from "@hackercamp/lib/array.mjs";

export function programChips(view, year, { program, programApproval }) {
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
          year,
        })}
        ${chip({
          text: "Ke schválení",
          count: programApproval,
          selected: view === View.programApproval,
          view: View.programApproval,
          year,
        })}
      </span>
    </div>
  `;
}

export function programModalDialog() {
  return html`
    <dialog id="program-modal">
      <div id="program-modal-root">nah</div>
      <hr />
      <button name="close" type="reset">Zavřít</button>
    </dialog>
  `;
}

function programTable(
  data,
  { approveEvent, deleteEvent, editEvent, showEditEventModalDialog }
) {
  return html`
    <table style="width: 100%;">
      <thead>
        <tr>
          <th>ID</th>
          <th>Název</th>
          <th>Jméno</th>
          <th>Téma</th>
          <th>Typ</th>
          <th>Stage</th>
          <th>Začátek</th>
          <th>Konec</th>
          <th>Akce</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(
          (row) => html`
            <tr data-id="${row._id}">
              <td>${when(row.id, () => html`<code>${row.id}</code>`)}</td>
              <td
                style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis"
              >
                ${row.title}
              </td>
              <td>${row.people?.[0].name}</td>
              <td>${when(row.topic, () => html`<code>${row.topic}</code>`)}</td>
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
                  @click="${() => {
                    showEditEventModalDialog(row, { editEvent });
                  }}"
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

function filterEvents(events) {
  return events.filter(({ type }) => ["org"].includes(type) === false);
}

export function programTemplate(state, actions) {
  const { data, selectedView, year } = state;
  return html`
    <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      ${programChips(selectedView, year, {
        [selectedView]: data?.then((data) => data.length),
      })}
    </div>
    <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      <div class="hc-card">
        ${until(
          data?.then((data) => {
            if (data.unauthorized) return unauthorized();
            return [
              programTable(
                sortBy("startAt", filterEvents(data), { asc: true }),
                actions
              ),
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
