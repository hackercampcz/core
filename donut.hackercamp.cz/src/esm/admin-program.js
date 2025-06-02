import { sortBy } from "@hackercamp/lib/array.js";
import { formatDateTime } from "@hackercamp/lib/format.js";
import { html } from "lit-html";
import { until } from "lit-html/directives/until.js";
import { when } from "lit-html/directives/when.js";
import { Action, chip, dispatchAction, lineup, renderModalDialog, unauthorized, View } from "./admin/common.js";
import { iconCheckSquare, iconEdit, iconTrash } from "./lib/icons.js";

function approveEvent(eventId) {
  return e => {
    e.preventDefault();
    dispatchAction(Action.approveEvent, { eventId });
  };
}

function deleteEvent(email) {
  return e => {
    e.preventDefault();
    dispatchAction(Action.invoiced, { email });
  };
}

export function programChips(view, year, { program, programApproval }) {
  return html`
    <div
      class="hc-chip-set"
      role="grid"
      id="filters"
      aria-orientation="horizontal"
      aria-multiselectable="false"
    >
      ${chip({ text: "Schváleno", count: program, selected: view === View.program, view: View.program, year })}
      ${chip({
        text: "Ke schválení",
        count: programApproval,
        selected: view === View.programApproval,
        view: View.programApproval,
        year
      })}
    </div>
  `;
}

export function programModalDialog() {
  return html`
    <dialog id="program-modal">
      <div id="program-modal-root">nah</div>
      <hr>
      <button name="close" type="reset">Zavřít</button>
    </dialog>
  `;
}

function programTable(data) {
  return html`
    <table>
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
      ${data.map(row => html`
          <tr data-id="${row._id}">
            <td>${when(row.id, () => html`<code>${row.id}</code>`)}</td>
            <td
              style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis"
            >
              ${row.title}
            </td>
            <td>${row.people?.[0]?.name}</td>
            <td>${when(row.topic, () => html`<code>${row.topic}</code>`)}</td>
            <td>${row.type}</td>
            <td>${lineup(row.lineup)}</td>
            <td>
              ${row.startAt ? formatDateTime(new Date(row.startAt)) : null}
            </td>
            <td>${row.endAt ? formatDateTime(new Date(row.endAt)) : null}</td>
            <td style="white-space: nowrap;">
              ${
                when(!row.approved, () =>
                  html`
                    <button class="icon-button small" title="Schválit event" @click="${approveEvent(row._id)}">
                      ${iconCheckSquare()}
                    </button>
                  `)
              }
              <button class="icon-button small" title="Upravit event" @click="${renderModalDialog("edit-event")}">
                ${iconEdit()}
              </button>
              <button class="icon-button small" title="Smazat event" @click="${deleteEvent(row._id, row.people?.map(x => x.slackID) ?? [])}">
                ${iconTrash()}
              </button>
            </td>
          </tr>
        `
      )
      }
      </tbody>
    </table>
  `;
}

function filterEvents(events) {
  return events.filter(({ type }) => ["org"].includes(type) === false);
}

export function programTemplate(state) {
  const { data, selectedView, year } = state;
  return html`
    <div class="">
      ${programChips(selectedView, year, { [selectedView]: data?.then(data => data.length) })}
    </div>
    <div class="">
      <div class="hc-card">
        ${until(data?.then(data => programTable(sortBy("startAt", filterEvents(data), { asc: true })))
          ?.catch(data => {
            if (data.unauthorized) return unauthorized();
          }),
          html`<p style="padding: 16px">Načítám data&hellip;</p>`
        )}
      </div>
    </div>
  `;
}
