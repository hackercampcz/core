import { html } from "lit-html";
import { until } from "lit-html/directives/until.js";
import { ticketName, unauthorized } from "./admin/common.js";
import { sortBy } from "@hackercamp/lib/array.mjs";
import { housing } from "./lib/attendee.js";

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

export function housingTemplate(state, actions) {
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
