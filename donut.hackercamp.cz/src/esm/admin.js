import { defAtom } from "@thi.ng/atom";
import { html } from "lit-html";
import { when } from "lit-html/directives/when.js";
import { until } from "lit-html/directives/until.js";
import { initRenderLoop } from "./renderer.js";

const View = {
  hackers: "hackers",
  plusOnes: "plusOnes",
  waitingList: "waitingList",
};

const state = defAtom({ selectedView: View.hackers, view: renderView });

const formatDateTime = (x) =>
  x?.toLocaleString("cs", { dateStyle: "short", timeStyle: "short" }) ?? null;
const sortByTimestamp = (x) =>
  x.sort((a, b) => -1 * a.timestamp.localeCompare(b.timestamp));

function chips(view) {
  return html`<span
    class="mdc-evolution-chip-set"
    role="grid"
    id="filters"
    aria-orientation="horizontal"
    aria-multiselectable="false"
  >
    <span class="mdc-evolution-chip-set__chips" role="presentation">
      <span
        class="mdc-evolution-chip mdc-evolution-chip--selectable mdc-evolution-chip--filter"
        role="presentation"
        id="filter-not-paid"
      >
        <a
          class="mdc-evolution-chip__action mdc-evolution-chip__action--primary"
          role="option"
          aria-selected="${view === View.hackers ? "true" : "false"}"
          tabindex="0"
          href="?view=${View.hackers}"
        >
          <span
            class="mdc-evolution-chip__ripple mdc-evolution-chip__ripple--primary"
          ></span>
          <span class="mdc-evolution-chip__graphic">
            <span class="mdc-evolution-chip__checkmark">
              <svg
                class="mdc-evolution-chip__checkmark-svg"
                viewBox="-2 -3 30 30"
              >
                <path
                  class="mdc-evolution-chip__checkmark-path"
                  fill="none"
                  stroke="black"
                  d="M1.73,12.91 8.1,19.28 22.79,4.59"
                />
              </svg>
            </span>
          </span>
          <span class="mdc-evolution-chip__text-label">Hackeři</span>
        </a>
      </span>
      <span
        class="mdc-evolution-chip mdc-evolution-chip--selectable mdc-evolution-chip--filter"
        role="presentation"
        id="filter-bank-transfer"
      >
        <a
          class="mdc-evolution-chip__action mdc-evolution-chip__action--primary"
          role="option"
          aria-selected="${view === View.plusOnes ? "true" : "false"}"
          tabindex="-1"
          href="?view=${View.plusOnes}"
        >
          <span
            class="mdc-evolution-chip__ripple mdc-evolution-chip__ripple--primary"
          ></span>
          <span class="mdc-evolution-chip__graphic">
            <span class="mdc-evolution-chip__checkmark">
              <svg
                class="mdc-evolution-chip__checkmark-svg"
                viewBox="-2 -3 30 30"
              >
                <path
                  class="mdc-evolution-chip__checkmark-path"
                  fill="none"
                  stroke="black"
                  d="M1.73,12.91 8.1,19.28 22.79,4.59"
                />
              </svg>
            </span>
          </span>
          <span class="mdc-evolution-chip__text-label">Plus Ones</span>
        </a>
      </span>
      <span
        class="mdc-evolution-chip mdc-evolution-chip--selectable mdc-evolution-chip--filter"
        role="presentation"
        id="filter-by-card"
      >
        <a
          class="mdc-evolution-chip__action mdc-evolution-chip__action--primary"
          role="option"
          aria-selected="${view === View.waitingList ? "true" : "false"}"
          tabindex="-1"
          href="?view=${View.waitingList}"
        >
          <span
            class="mdc-evolution-chip__ripple mdc-evolution-chip__ripple--primary"
          ></span>
          <span class="mdc-evolution-chip__graphic">
            <span class="mdc-evolution-chip__checkmark">
              <svg
                class="mdc-evolution-chip__checkmark-svg"
                viewBox="-2 -3 30 30"
              >
                <path
                  class="mdc-evolution-chip__checkmark-path"
                  fill="none"
                  stroke="black"
                  d="M1.73,12.91 8.1,19.28 22.79,4.59"
                />
              </svg>
            </span>
          </span>
          <span class="mdc-evolution-chip__text-label">Waiting List</span>
        </a>
      </span>
    </span>
  </span>`;
}

function renderTable(data, view) {
  return html`
    <div id="top" class="mdc-layout-grid">
      <div class="mdc-layout-grid__inner">
        <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
          ${chips(view)}
        </div>
        <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
          <table>
            <thead>
              <tr>
                <th>Jméno</th>
                <th>Společnost</th>
                <th>Čas registrace</th>
                <th>Akce</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(
                (row) => html`
                <tr>
                  <td>${row.firstName} ${row.lastName}</td>
                  <td>${row.company}</td>
                  <td>${formatDateTime(new Date(row.timestamp))}</td>
                  <td>
                    <a
                      href="mailto:${row.email}"
                      title="Napsat ${row.email}""><svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24"
                      width="24"
                    >
                      <path d="M0 0h24v24H0z" fill="none"/>
                      <path
                        d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"
                      />
                    </svg></a>
                    <a
                      href="tel:${row.phone.replace(" ", "")}"
                      title="Zavolat ${row.phone}"><svg
                        xmlns="http://www.w3.org/2000/svg"
                        height="24"
                        width="24"
                      >
                        <path d="M0 0h24v24H0z" fill="none"/>
                        <path
                          d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
                        />
                      </svg></a>
                  </td>
                </tr>
              `
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderView(state) {
  return html`${until(
    state.data?.then((x) => renderTable(sortByTimestamp(x))),
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
