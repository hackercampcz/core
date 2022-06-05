import { defAtom } from "@thi.ng/atom";
import { html } from "lit-html";
import { when } from "lit-html/directives/when.js";
import { until } from "lit-html/directives/until.js";
import { initRenderLoop } from "./renderer.js";

const View = {
  hackers: "hackers",
  onePlus: "onePlus",
  waitingList: "waitingList",
};

const state = defAtom({ selectedView: View.hackers, view: renderView });

function renderTable(data) {
  return html`
    <table>
      <thead>
        <tr>
          <th>Jméno</th>
          <th>E-mail</th>
          <th>Telefon</th>
          <th>Společnost</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(
          (row) => html`
            <tr>
              <td>${row.firstName} ${row.lastName}</td>
              <td>${row.email}</td>
              <td>${row.phone}</td>
              <td>${row.company}</td>
            </tr>
          `
        )}
      </tbody>
    </table>
  `;
}

function renderView(state) {
  return html`${until(
    state.data?.then((x) => renderTable(x)),
    html`<p>Načítám data&hellip;</p>`
  )}`;
}

/**
 *
 * @param {Atom} state
 * @param {URLSearchParams} searchParams
 */
function loadData(state, searchParams) {
  const view = searchParams.get("view") ?? View.hackers;
  state.swap((x) =>
    Object.assign(x, {
      data: fetch(
        `https://api.hackercamp.cz/v1/admin/registrations?type=${view}`
      ).then((resp) => resp.json()),
    })
  );
}

export async function main({ appRoot, searchParams, env }) {
  initRenderLoop(state, appRoot);
  loadData(state, searchParams);
}
