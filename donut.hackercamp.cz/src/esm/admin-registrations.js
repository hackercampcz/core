import {
  chip,
  paginationNavigation,
  ticketDetail,
  unauthorized,
  View,
} from "./admin/common.js";
import { html } from "lit-html";
import { formatDateTime } from "@hackercamp/lib/format.mjs";
import { when } from "lit-html/directives/when.js";
import { housing, ticketBadge, travel } from "./lib/attendee.js";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import * as marked from "marked";
import { until } from "lit-html/directives/until.js";
import { sortBy } from "@hackercamp/lib/array.mjs";

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
  { page, pages, total, params },
  { renderDetail }
) {
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
          <tr
            @click="${renderDetail(row)}">
            <td>${row.name}</td>
            <td>${row.company}</td>
            <td>${row[timeAttr] ? formatDateTime(new Date(row[timeAttr])) : ""}
            </td>
            <td>
              <a
                class="hc-action-button"
                href="mailto:${row.email}"
                title="Napsat ${row.email}"">
                <i class="material-icons-outlined">mail</i>
              </a>
              ${when(
                row.phone,
                () => html`
                  <a
                    class="hc-action-button"
                    href="tel:${row.phone.replace(" ", "")}"
                    title="Zavolat ${row.phone}"
                  >
                    <i class="material-icons-outlined">call</i>
                  </a>
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

export function registrationDetailTemplate(
  { detail, selectedView },
  { optout, optin, invoiced }
) {
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
        title="Napsat ${detail.email}"">
        <i class="material-icons-outlined">mail</i>
      </a>
      ${when(
        detail.phone,
        () => html`
          <a
            class="hc-action-button"
            href="tel:${detail.phone.replace(" ", "")}"
            title="Zavolat ${detail.phone}"
          >
            <i class="material-icons-outlined">call</i>
          </a>
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
            <span class="material-icons-outlined">person_add</span>
          </button>
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
            <span class="material-icons-outlined">person_remove</span>
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
            <span class="material-icons-outlined">request_quote</span>
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

const timeColumn = new Map([
  [View.paid, { timeHeader: "Čas zaplacení", timeAttr: "paid" }],
  [View.attendees, { timeHeader: "Čas zaplacení", timeAttr: "paid" }],
  [View.invoiced, { timeHeader: "Čas fakturace", timeAttr: "invoiced" }],
]);

export function registrationsTemplate(state, actions) {
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
              { page, pages: data.pages, total: data.total, params },
              actions
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
        registrationDetailTemplate({ detail, selectedView }, actions)
      )}
    </div>
  `;
}
