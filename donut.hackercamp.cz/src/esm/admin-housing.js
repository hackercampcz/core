import { sortBy } from "@hackercamp/lib/array.mjs";
import { html } from "lit-html";
import { until } from "lit-html/directives/until.js";
import { ticketName, unauthorized } from "./admin/common.js";
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
                <md-standard-link-icon-button
                  href="mailto:${row.email}"
                  title="Napsat ${row.email}"
                  >mail</md-standard-link-icon-button
                >
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
