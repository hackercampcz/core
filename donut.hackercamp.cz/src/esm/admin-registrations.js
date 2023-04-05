import { sortBy } from "@hackercamp/lib/array.mjs";
import { formatDateTime } from "@hackercamp/lib/format.mjs";
import { html } from "lit-html";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { until } from "lit-html/directives/until.js";
import { when } from "lit-html/directives/when.js";
import * as marked from "marked";
import {
  Action,
  chip,
  closeDetail,
  dispatchAction,
  paginationNavigation,
  renderDetail,
  ticketDetail,
  unauthorized,
  View,
} from "./admin/common.js";
import { housing, ticketBadge, travel } from "./lib/attendee.js";

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

export function registrationsChips(
  view,
  year,
  { waitingList, confirmed, invoiced, paid, optouts }
) {
  return html`
    <search
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
          text: "Opt-outs",
          count: optouts,
          selected: view === View.optouts,
          view: View.optouts,
          year,
        })}
      </span>
    </search>
  `;
}

export function registrationsTableTemplate(
  data,
  { timeHeader, timeAttr },
  { page, pages, total, params }
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
                  @click="${(e) => e.stopPropagation()}"
                ></md-checkbox>
              </td>
              <td>${row.name}</td>
              <td>${row.company}</td>
              <td>
                ${row[timeAttr] ? formatDateTime(new Date(row[timeAttr])) : ""}
              </td>
              <td>
                ${html`<md-standard-link-icon-button
                    href="mailto:${row.email}"
                    title="Napsat ${row.email}"
                    >mail</md-standard-link-icon-button
                  >${when(
                    row.phone,
                    () => html`<md-standard-link-icon-button
                      href="tel:${row.phone.replace(/\s+/g, "")}"
                      title="Zavolat ${row.phone}"
                      >call</md-standard-link-icon-button
                    >`
                  )}`}
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
        @click="${closeDetail()}">arrow_back</md-standard-icon-button>
      <h2 style="margin: 0">${detail.firstName}&nbsp;${detail.lastName}</h2>
      ${ticketBadge.get(detail.ticketType)}</div>
    <p>${detail.company}</p>
    <div class="hc-detail__tools">
      <md-standard-link-icon-button
        href="mailto:${detail.email}"
        title="Napsat ${detail.email}"
      >mail</md-standard-link-icon-button>${when(
        detail.phone,
        () => html`<md-standard-link-icon-button
          href="tel:${detail.phone.replace(/\s+/g, "")}"
          title="Zavolat ${detail.phone}"
          >call</md-standard-link-icon-button
        >`
      )}${when(
    selectedView === View.waitingList,
    () => html`<md-standard-icon-button
      title="Opt in"
      @click="${optin(detail.email)}"
      >person_add</md-standard-icon-button
    >`
  )}${when(
    selectedView !== View.paid,
    () => html`<md-standard-icon-button
      title="Opt out"
      @click="${optout(detail.email)}"
      >person_remove</md-standard-icon-button
    >`
  )}${when(
    selectedView === View.confirmed,
    () => html`<md-standard-icon-button
      title="Vyfakturováno"
      @click="${invoiced(detail.email)}"
      >request_quote</md-standard-icon-button
    >`
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

const timeColumn = new Map([
  [View.paid, { timeHeader: "Čas zaplacení", timeAttr: "paid" }],
  [View.attendees, { timeHeader: "Čas zaplacení", timeAttr: "paid" }],
  [View.invoiced, { timeHeader: "Čas fakturace", timeAttr: "invoiced" }],
]);

export function registrationsTemplate(state) {
  const { data, selectedView, detail, year, page, params } = state;
  return html`
    <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      ${registrationsChips(selectedView, year, {
        [View.paid]: data?.then((data) => data.counts.paid),
        [View.invoiced]: data?.then((data) => data.counts.invoiced),
        [View.confirmed]: data?.then((data) => data.counts.confirmed),
        [View.waitingList]: data?.then((data) => data.counts.waitingList),
      })}
    </div>
    <div
      class="hc-master-detail mdc-layout-grid__cell mdc-layout-grid__cell--span-12"
    >
      <form class="hc-card hc-master-detail__list">
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
              { page, pages: data.pages, total: data.total, params }
            );
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
