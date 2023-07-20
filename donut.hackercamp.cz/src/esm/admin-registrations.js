import { sortBy } from "@hackercamp/lib/array.mjs";
import {
  formatDateTime,
  formatMoney,
  parseDateTime,
} from "@hackercamp/lib/format.mjs";
import { html } from "lit-html";
import { map } from "lit-html/directives/map.js";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { until } from "lit-html/directives/until.js";
import { when } from "lit-html/directives/when.js";
import * as marked from "marked";
import {
  Action,
  chip,
  closeDetail,
  dispatchAction,
  Endpoint,
  executeCommand,
  getTicketPrice,
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

function optout(email) {
  return (e) => {
    e.preventDefault();
    dispatchAction(Action.optout, { email });
  };
}

function optin(email) {
  return (e) => {
    e.preventDefault();
    dispatchAction(Action.optin, { email });
  };
}

function invoiced(email) {
  return (e) => {
    e.preventDefault();
    dispatchAction(Action.invoiced, { email });
  };
}
function invoiceSelected() {
  return (e) => {
    e.preventDefault();
    dispatchAction(Action.showModalDialog, { name: "group-invoice" });
  };
}

function submitInvoiceSelected() {
  return (e) => {
    e.preventDefault();
    const invoiceId = e.target.invoiceId.value;
    dispatchAction(Action.invoiceSelected, { invoiceId });
  };
}

registerDialog("group-invoice", groupInvoiceModal);

function invoiceSummary(selection) {
  return ({ items }) => {
    const registrations = new Map(
      items.map((x) => [
        x.email,
        Object.assign(
          {
            get name() {
              return `${this.firstName} ${this.lastName}`;
            },
            get price() {
              return getTicketPrice(this);
            },
          },
          x
        ),
      ])
    );
    const regs = Array.from(selection).map((email) => registrations.get(email));
    const total = regs.map((x) => x.price).reduce((a, b) => a + b, 0);
    const invContacts = new Set(regs.map((x) => x.invRecipientEmail));
    return html`
      ${map(
        regs.filter((x) => x.invAddress),
        invoiceDetails
      )}
      <p>
        Fakturu zaslat na:
        ${map(invContacts, (x) => html`<a href="mailto:${x}">${x}</a>`)}
      </p>
      <h4>Položky na faktuře</h4>
      <ul style="list-style-type: none; padding: 0">
        ${map(selection, (email) => {
          const reg = registrations.get(email);
          return html`
            <li
              style="display: flex; flex-direction: row; align-items: stretch; justify-content: space-between"
            >
              <span>${reg.name} - ${ticketName.get(reg.ticketType)}</span>
              <data value="${reg.price}">${formatMoney(reg.price)} Kč</data>
            </li>
          `;
        })}
        <li
          style="display: flex; flex-direction: row; align-items: stretch; justify-content: space-between; border-top: 3px double; margin-top: 5px;"
        >
          <span>Celkem</span>
          <data value="${total}">${formatMoney(total)} Kč</data>
        </li>
      </ul>
    `;
  };
}

function groupInvoiceModal({ data, selection }) {
  return html`
    <form @submit="${submitInvoiceSelected()}">
      <h2>Podklady k hromadné fakturaci</h2>
      ${until(data.then(invoiceSummary(selection)))}
      <fieldset>
        <legend>Hromadná fakturace</legend>
        <div class="field">
          <label for="invoiceId">ID faktury z fakturoidu (v URL)</label>
          <input
            type="text"
            id="invoiceId"
            name="invoiceId"
            required
            pattern="[0-9]*"
            inputmode="numeric"
          />
        </div>
        <button class="hc-button" type="submit">Potvrdit</button>
      </fieldset>
    </form>
  `;
}

function copyToClipboard(counts) {
  return async () => {
    const [paid, invoiced, confirmed, waitingList, volunteers, staff] =
      await Promise.all(counts);
    const rich = new Blob(
      [
        `<ul>
          <li>Zaplacení: <b>${paid}</b>
          <li>Vyfakturovaní: <b>${invoiced}</b>
          <li>Potvrzení: <b>${confirmed}</b>
          <li>Waiting list: <b>${waitingList}</b>
          <li>Dobrovolníci: <b>${volunteers}</b>
          <li>Ostatní: <b>${staff}</b>
        </ul>`,
      ],
      { type: "text/html" }
    );
    const plain = new Blob(
      [
        `* Zaplacení: ${paid}\n* Vyfakturovaní: ${invoiced}\n* Potvrzení: ${confirmed}\n* Waiting list: ${waitingList}\n* Dobrovolnící: ${volunteers}\n* Ostatní: ${staff}`,
      ],
      { type: "text/plain" }
    );
    await navigator.clipboard.write([
      new ClipboardItem({ "text/html": rich, "text/plain": plain }),
    ]);
    window.snackbar.labelText = "Statistiky zkopírovány do schránky";
    window.snackbar.show();
  };
}

export function registrationsChips(
  view,
  year,
  { waitingList, confirmed, invoiced, paid, optouts, volunteers, staff }
) {
  return html`
    <search style="display: flex; gap: 8px">
      <div>
        <md-standard-icon-button>
          <md-icon>search</md-icon>
        </md-standard-icon-button>
      </div>
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
            year,
          })}
          ${chip({
            text: "Vyfakturovaní",
            count: invoiced,
            selected: view === View.invoiced,
            view: View.invoiced,
            year,
          })}
          ${chip({
            text: "Potvrzení",
            count: confirmed,
            selected: view === View.confirmed,
            view: View.confirmed,
            year,
          })}
          ${chip({
            text: "Waiting list",
            count: waitingList,
            selected: view === View.waitingList,
            view: View.waitingList,
            year,
          })}
          ${chip({
            text: "Dobrovolníci",
            count: volunteers,
            selected: view === View.volunteers,
            view: View.volunteers,
            year,
          })}
          ${chip({
            text: "Ostatní",
            count: staff,
            selected: view === View.staff,
            view: View.staff,
            year,
          })}
          ${chip({
            text: "Opt-outs",
            count: optouts,
            selected: view === View.optouts,
            view: View.optouts,
            year,
          })}
        </span>
      </div>
      <div>
        <md-standard-icon-button
          title="Zkopírovat statistiky"
          @click="${copyToClipboard([
            paid,
            invoiced,
            confirmed,
            waitingList,
            volunteers,
            staff,
          ])}"
        >
          <md-icon>content_copy</md-icon></md-standard-icon-button
        ><md-standard-icon-button
          href="https://api.hackercamp.cz/v1/admin/registrations?${new URLSearchParams(
            { year, type: view, format: "csv", pageSize: 500 }
          )}"
          title="Stáhnout CSV"
          aria-label="Stáhnout CSV"
        >
          <md-icon>download</md-icon>
        </md-standard-icon-button>
      </div>
    </search>
  `;
}

function multiRowSelection(indeterminate, checked, items) {
  return () => {
    if (indeterminate) {
      dispatchAction(Action.select, { keys: items.map((x) => x.email) });
    } else if (checked) {
      dispatchAction(Action.unselect, { all: true });
    }
  };
}

export async function selectionBar(selectedView, selection, data) {
  const { items } = await data;
  const checked = selection.size === items.length;
  const indeterminate = selection.size < items.length;
  return html`
    <div>
      <md-checkbox
        ?checked="${checked}"
        ?indeterminate="${indeterminate}"
        @click="${multiRowSelection(indeterminate, checked, items)}"
      ></md-checkbox>
      ${when(
        selectedView === View.confirmed,
        () =>
          html`<md-standard-icon-button
            title="Vyfakturovat"
            @click="${invoiceSelected()}"
            ><md-icon>request_quote</md-icon>
          </md-standard-icon-button>`
      )}
    </div>
  `;
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

export function registrationsTableTemplate(
  data,
  { timeHeader, timeAttr },
  { page, pages, total, params, selection }
) {
  return html`
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Jméno</th>
          <th>Společnost</th>
          <th>${timeHeader}</th>
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
                  value="${row.email}"
                  @click="${selectRow}"
                  ?checked="${selection.has(row.email)}"
                ></md-checkbox>
              </td>
              <td>${row.name}</td>
              <td>${row.company}</td>
              <td>
                ${row[timeAttr] ? formatDateTime(new Date(row[timeAttr])) : ""}
              </td>
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

export function registrationDetailTemplate({ detail, selectedView }) {
  if (!detail) return null;
  return html`
    <div class="hc-card hc-master-detail__detail"">
    <div style="display: flex;align-items: center;gap: 12px;">
      <md-standard-icon-button
        aria-label="Zavřít detail"
        title="Zavřít detail"
        @click="${closeDetail()}">
        <md-icon>arrow_back</md-icon>
      </md-standard-icon-button>
      <h2 style="margin: 0">${detail.firstName}&nbsp;${detail.lastName}</h2>
      ${ticketBadge.get(detail.ticketType)}</div>
    <p>${detail.company}</p>
    <div class="hc-detail__tools">
      <hc-mail-button
        email="${detail.email}"></hc-mail-button
      ><hc-phone-button
          phone="${detail.phone}"
          ></hc-phone-button
    >${when(
      selectedView === View.waitingList,
      () =>
        html`<md-standard-icon-button
          title="Opt in"
          @click="${optin(detail.email)}"
        >
          <md-icon>person_add</md-icon>
        </md-standard-icon-button>`
    )}${when(
      selectedView !== View.paid,
      () =>
        html`<md-standard-icon-button
          title="Opt out"
          @click="${optout(detail.email)}"
        >
          <md-icon>person_remove</md-icon></md-standard-icon-button
        >`
    )}${when(
      selectedView === View.confirmed,
      () =>
        html`<md-standard-icon-button
          title="Vyfakturovat"
          @click="${invoiced(detail.email)}"
        >
          <md-icon>request_quote</md-icon></md-standard-icon-button
        >`
    )}<md-standard-icon-button
        title="Upravit registraci"
        @click="${renderModalDialog("registration-modal")}"
      >
        <md-icon>edit</md-icon>
      </md-standard-icon-button>
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
          Fakturovat za něj bude
          <a href="mailto:${detail.invRecipientEmail}"
            >${detail.invRecipientFirstname} ${detail.invRecipientLastname}</a
          >
          <a href="tel:${detail.invRecipientPhone}"
            >${detail.invRecipientPhone}</a
          >
        </p>
      `
    )}
    ${when(detail.invAddress, () => invoiceDetails(detail))}
    </div>
  `;
}
function invoiceDetails(detail) {
  return html`
    <address style="border: 1px solid #ddd; padding: 16px; font-size: 14px;">
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
  `;
}

const timeColumn = new Map([
  [View.paid, { timeHeader: "Čas zaplacení", timeAttr: "paid" }],
  [View.attendees, { timeHeader: "Čas zaplacení", timeAttr: "paid" }],
  [View.invoiced, { timeHeader: "Čas fakturace", timeAttr: "invoiced" }],
]);

export function registrationsTemplate(state) {
  const { data, selectedView, detail, year, page, params, selection } = state;
  return html`
    <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      ${when(
        selection.size,
        () => until(selectionBar(selectedView, selection, data)),
        () =>
          registrationsChips(selectedView, year, {
            [View.paid]: data?.then((data) => data.counts.paid),
            [View.invoiced]: data?.then((data) => data.counts.invoiced),
            [View.confirmed]: data?.then((data) => data.counts.confirmed),
            [View.waitingList]: data?.then((data) => data.counts.waitingList),
            [View.volunteers]: data?.then((data) => data.counts.volunteers),
            [View.staff]: data?.then((data) => data.counts.staff),
          })
      )}
    </div>
    <div
      class="hc-master-detail mdc-layout-grid__cell mdc-layout-grid__cell--span-12"
    >
      <form class="hc-card hc-master-detail__list">
        ${until(
          data
            ?.then((data) => {
              const timeColumnSettings = timeColumn.get(selectedView) ?? {
                timeHeader: "Čas registrace",
                timeAttr: "timestamp",
              };
              if (selectedView === View.optouts) {
                return html`
                  <ul>
                    ${data.map((x) => html` <li>${x}</li>`)}
                  </ul>
                `;
              }
              return registrationsTableTemplate(
                sortBy(
                  timeColumnSettings.timeAttr,
                  data.items.map((x) =>
                    Object.assign({}, x, {
                      name: x.name ?? `${x.firstName} ${x.lastName}`,
                    })
                  )
                ),
                timeColumnSettings,
                {
                  page,
                  pages: data.pages,
                  total: data.total,
                  params,
                  selection,
                }
              );
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
      </form>
      ${when(detail, () =>
        registrationDetailTemplate({ detail, selectedView })
      )}
    </div>
  `;
}

/**
 * @param {Object} registration
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function edit(registration, apiHost) {
  const contact = getContact();
  return executeCommand(apiHost, Endpoint.registrations, "edit", {
    ...registration,
    editedBy: contact.email,
  }).then(() => location.reload());
}

registerDialog("registration-modal", registrationModalDialog);

// const juri = {
//   activity:
//     "Možná druhý ročník loňského spontánního Programmers Anonymous, kde si vylejeme frustrace a srdíčka.",
//   activityCrew: "Aleš Roubíček, pokud bude mít chuť. Kontakt máte",
//   invRecipientEmail: "ales.roubicek@topmonks.com",
//   housing: "own-car",
//   lastName: "Jansa",
//   invRecipientPhone: "+420737461283",
//   firstTime: false,
//   email: "jirka.jansa@topmonks.com",
//   firstName: "Jiří",
//   paid: "2023-06-23T00:00:00.000Z",
//   stayTime: "0",
//   activityPlace: "malá stage ve stanu minule byla úplně dostačující",
//   company: "TopMonks",
//   ticketType: "hacker",
//   travel: "free-car",
//   edited: "2023-07-17T16:01:05.030Z",
//   id: "5f60b2645ae1223b981e01a76319c0d7f48c39f1",
//   invRecipientFirstname: "Aleš",
//   phone: "+420777642895",
//   timestamp: "2023-05-28T18:37:21.097Z",
//   editedBy: "vaclav.slavik@topmonks.com",
//   invoiced: "2023-06-17T13:08:16.492+02:00",
//   invRecipientLastname: "Roubíček",
//   invoice_id: 29636597,
//   year: 2023,
//   invRecipient: "1",
//   name: "Jiří Jansa",
// };

function registrationModalDialog({ detail, apiHost }) {
  const onSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    await edit(Object.fromEntries(form.entries()), apiHost);
  };
  return html`
    <form method="post" @submit="${onSubmit}">
      <input type="hidden" name="year" value="${detail.year}" />
      <div class="group">
        <div class="field">
          <label for="firstName">Jméno</label>
          <input
            id="firstName"
            name="firstName"
            value="${detail.firstName}"
            required
          />
        </div>
        <div class="field">
          <label for="lastName">Příjmení</label>
          <input
            id="lastName"
            name="lastName"
            value="${detail.lastName}"
            required
          />
        </div>
      </div>
      <div class="group">
        <div class="field">
          <label for="email">E-mail</label>
          <input
            id="email"
            name="email"
            value="${detail.email}"
            type="email"
            readonly
            required
          />
        </div>
        <div class="field">
          <label for="phone">Tel</label>
          <input
            id="phone"
            name="phone"
            value="${detail.phone}"
            type="tel"
            autocomplete="tel"
            required
          />
        </div>
      </div>
      ${when(
        detail.paid,
        () => html`
          <div class="field">
            <label for="paid">Čas zaplacení</label>
            <input id="paid" name="paid" value="${detail.paid}" required />
          </div>
        `
      )}
      <div class="field">
        <label for="company">Společnost</label>
        <input id="company" name="company" value="${detail.company}" />
      </div>

      <div class="field">
        <label for="ticketType">Lístek</label>
        <input id="ticketType" name="ticketType" value="${detail.ticketType}" />
      </div>

      <button type="submit" class="hc-button">Odeslat to</button>
    </form>
  `;
}
