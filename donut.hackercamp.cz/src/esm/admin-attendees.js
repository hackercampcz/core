import { sortBy } from "@hackercamp/lib/array.mjs";
import { formatDateTime } from "@hackercamp/lib/format.mjs";
import { html } from "lit-html";
import { until } from "lit-html/directives/until.js";
import { when } from "lit-html/directives/when.js";
import {
  Action,
  chip,
  closeDetail,
  dispatchAction,
  Endpoint,
  executeCommand,
  lineup,
  paginationNavigation,
  registerDialog,
  renderDetail,
  renderModalDialog,
  ticketDetail,
  ticketName,
  unauthorized,
  View,
} from "./admin/common.js";
import { housing, ticketBadge, travel } from "./lib/attendee.js";
import "./components/phone-button.js";
import "./components/mail-button.js";
import { getContact } from "./lib/profile";

/**
 * @param {Object} attendee
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function edit(attendee, apiHost) {
  const contact = getContact();
  return executeCommand(apiHost, Endpoint.attendees, "edit", {
    ...attendee,
    editedBy: contact?.email,
  }).then(() => location.reload());
}

/**
 * @param {Object} attendee
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function add(attendee, apiHost) {
  return executeCommand(apiHost, Endpoint.attendees, "add", attendee).then(() =>
    location.reload()
  );
}

function selectRow(e) {
  e.stopPropagation();
  const key = e.target.value;
  if (!e.target.checked) {
    dispatchAction(Action.select, { keys: [key] });
  } else {
    dispatchAction(Action.unselect, { key });
  }
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
    <div style="display: flex; gap: 8px">
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
      <div>
        <md-icon-button
          title="Přidat účastníka"
          @click="${renderModalDialog("add-attendee-modal")}"
        >
          <md-icon>person_add</md-icon></md-icon-button
        >
      </div>
    </div>
  `;
}

export function attendeesTableTemplate(
  data,
  { page, pages, total, params, selection }
) {
  return html`
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Jméno</th>
          <th>Společnost</th>
          <th>Typ lístku</th>
          <th>Zaplaceno</th>
          <th>NFCtron</th>
          <th>Akce</th>
        </tr>
      </thead>
      <tfoot>
        <tr>
          <td colspan="5">
            ${paginationNavigation({
              page,
              pages,
              total,
              count: data.length,
              params,
            })}
          </td>
        </tr>
      </tfoot>
      <tbody>
        ${data.map(
          (row) => html`
            <tr @click="${renderDetail(row)}">
              <td>
                <md-checkbox
                  aria-label="vybrat"
                  value="${row.slackID}"
                  @click="${selectRow}"
                  touch-target="wrapper"
                  ?checked="${selection.has(row.slackID)}"
                ></md-checkbox>
              </td>
              <td>${row.name}</td>
              <td>${row.company}</td>
              <td>${ticketName.get(row.ticketType)}</td>
              <td>${row.paid ? formatDateTime(new Date(row.paid)) : ""}</td>
              <td>${row.nfcTronID}</td>
              <td>
                <hc-mail-button email="${row.email}"></hc-mail-button
                ><hc-phone-button phone="${row.phone}"></hc-phone-button>
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
    <div style="display: flex; align-items: center; gap: 12px;">
      <md-icon-button
        aria-label="Zavřít detail"
        title="Zavřít detail"
        @click="${closeDetail()}">
        <md-icon>arrow_back</md-icon>
      </md-icon-button>
      <h2 style="margin: 0">${detail.name}</h2>
      ${ticketBadge.get(detail.ticketType)}</div>
    <p>${detail.company}</p>
    <div class="hc-detail__tools">
      <hc-mail-button email="${detail.email}"></hc-mail-button
      ><md-icon-button
        title="Upravit účastníka"
        @click="${renderModalDialog("edit-attendee-modal")}"
      >
      <md-icon>edit</md-icon>
    </md-icon-button>
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
      detail.edited,
      () => html`
        <p>
          Naposledy editováno
          <strong>${formatDateTime(new Date(detail.edited))}</strong>
          administrátorem
          <strong>${detail.editedBy}</strong>
        </p>
      `
    )}
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
                  () =>
                    html`-
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

registerDialog("edit-attendee-modal", editAttendeeModalDialog);
registerDialog("add-attendee-modal", addAttendeeModalDialog);

function editAttendeeModalDialog({ detail, apiHost }) {
  const onSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    await edit(Object.fromEntries(form.entries()), apiHost);
  };
  return html`
    <form method="post" @submit="${onSubmit}">
      <input type="hidden" name="year" value="${detail.year}" />
      <input type="hidden" name="slackID" value="${detail.slackID}" />
      <div class="field">
        <label for="name">Jméno</label>
        <input id="name" name="name" value="${detail.name}" required />
      </div>
      <div class="field">
        <label for="email">E-mail</label>
        <input
          id="email"
          name="email"
          value="${detail.email}"
          type="email"
          required
        />
      </div>
      <div class="field">
        <label for="company">Společnost</label>
        <input id="company" name="company" value="${detail.company}" />
      </div>
      <div class="field">
        <label for="note">Poznámka</label>
        <input id="note" name="note" value="${detail.note}" />
      </div>
      <div class="field">
        <label for="nfc-tron-id">NFCtron ID</label>
        <input id="nfc-tron-id" name="nfcTronID" value="${detail.nfcTronID}" />
      </div>
      <button type="submit" class="hc-button">Odeslat to</button>
    </form>
  `;
}

function addAttendeeModalDialog({ year, apiHost }) {
  const onSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    await add(Object.fromEntries(form.entries()), apiHost);
  };
  return html`
    <form method="post" @submit="${onSubmit}">
      <input type="hidden" name="year" value="${year}" />
      <div class="field">
        <label for="name">Jméno</label>
        <input id="name" name="name" required />
      </div>
      <div class="field">
        <label for="email">E-mail</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div class="field">
        <label for="ticketType">Lístek</label>
        <input id="ticketType" name="ticketType" required />
      </div>
      <div class="field">
        <label for="company">Společnost</label>
        <input id="company" name="company" />
      </div>
      <div class="field">
        <label for="note">Poznámka</label>
        <input id="note" name="note" />
      </div>
      <div class="field">
        <label for="nfc-tron-id">NFCtron ID</label>
        <input id="nfc-tron-id" name="nfcTronID" />
      </div>

      <h3>Fakturace</h3>
      <fieldset id="I-will-pay">
        <legend>Zaplatí sám</legend>
        <div class="field">
          <label for="invoice-name"> Jméno / název společnosti </label>
          <input id="invoice-name" name="invName" type="text" />
        </div>
        <div class="field">
          <label for="invoice-address"> Adresa (Ulice č.p., PSČ, Město) </label>
          <input id="invoice-address" name="invAddress" type="text" />
        </div>
        <div class="group">
          <div class="field">
            <label for="invoice-regno"> IČO </label>
            <input id="invoice-regno" name="invRegNo" type="text" />
          </div>
          <div class="field">
            <label for="invoice-vatno"> DIČ </label>
            <input id="invoice-vatno" name="invVatNo" type="text" />
          </div>
        </div>
        <div class="field">
          <label for="invoice-text"> Text na faktuře </label>
          <input id="invoice-text" name="invText" type="text" />
        </div>
        <div class="field">
          <label for="invoice-email"> Kontakt pro fakturaci </label>
          <input
            id="invoice-email"
            name="invEmail"
            type="email"
            autocomplete="email"
          />
        </div>
      </fieldset>

      <fieldset id="someone-else-will-pay">
        <legend>Zaplatí za něj někdo jiný</legend>
        <div class="group">
          <div class="field">
            <label for="invoice-recipient-firstname"> Jméno </label>
            <input
              id="invoice-recipient-firstname"
              name="invRecipientFirstname"
              type="text"
            />
          </div>
          <div class="field">
            <label for="invoice-recipient-lastname"> Příjmení </label>
            <input
              id="invoice-recipient-lastname"
              name="invRecipientLastname"
              type="text"
            />
          </div>
        </div>
        <div class="group">
          <div class="field">
            <label for="invoice-recipient-email"> E-mail </label>
            <input
              id="invoice-recipient-email"
              name="invRecipientEmail"
              type="email"
            />
          </div>
          <div class="field">
            <label for="invoice-recipient-phone"> Telefon </label>
            <input
              id="invoice-recipient-phone"
              name="invRecipientPhone"
              type="tel"
            />
          </div>
        </div>
      </fieldset>

      <button type="submit" class="hc-button">Odeslat to</button>
    </form>
  `;
}

export function attendeesTemplate(state) {
  const { data, selectedView, detail, year, page, params, selection } = state;

  console.log(data);
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
          data
            ?.then((data) => {
              return attendeesTableTemplate(sortBy("paid", data.items), {
                page,
                pages: data.pages,
                total: data.total,
                params,
                selection,
              });
            })
            ?.catch((data) => {
              if (data.unauthorized) return unauthorized();
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
