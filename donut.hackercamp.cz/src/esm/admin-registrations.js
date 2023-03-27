import { chip, ticketDetail, unauthorized, View } from "./admin/common.js";
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
          text: "Opt-outs",
          count: optouts,
          selected: view === View.optouts,
          view: View.optouts,
          year,
        })}
      </span>
    </div>
  `;
}

export function registrationsTableTemplate(
  data,
  { timeHeader, timeAttr },
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
              ${when(
                row.phone,
                () => html`
                  <a
                    class="hc-action-button"
                    href="tel:${row.phone.replace(" ", "")}"
                    title="Zavolat ${row.phone}"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24"
                      width="24"
                    >
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path
                        fill="var(--hc-text-color)"
                        d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
                      />
                    </svg>
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
      ${when(
        detail.phone,
        () => html`
          <a
            class="hc-action-button"
            href="tel:${detail.phone.replace(" ", "")}"
            title="Zavolat ${detail.phone}"
          >
            <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24">
              <path d="M0 0h24v24H0z" fill="none" />
              <path
                fill="var(--hc-text-color)"
                d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
              />
            </svg>
          </a>
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
              <g>
                <rect fill="none" height="24" width="24" />
              </g>
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
              <g>
                <rect fill="none" height="24" width="24" />
              </g>
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

const timeColumn = new Map([
  [View.paid, { timeHeader: "Čas zaplacení", timeAttr: "paid" }],
  [View.attendees, { timeHeader: "Čas zaplacení", timeAttr: "paid" }],
  [View.invoiced, { timeHeader: "Čas fakturace", timeAttr: "invoiced" }],
]);

export function registrationsTemplate(state, actions) {
  const { data, selectedView, detail, year } = state;
  return html`
    <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      ${registrationsChips(selectedView, year, {
        [selectedView]: data?.then((data) => data.total),
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
