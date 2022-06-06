import { defAtom } from "@thi.ng/atom";
import { html, svg } from "lit-html";
import { classMap } from "lit-html/directives/class-map.js";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { until } from "lit-html/directives/until.js";
import { when } from "lit-html/directives/when.js";
import { initRenderLoop } from "./renderer.js";
import * as marked from "marked";

const View = {
  hackers: "hackers",
  hackersConfirmed: "hackersConfirmed",
  plusOnes: "plusOnes",
  waitingList: "waitingList",
};

const state = defAtom({
  selectedView: View.hackersConfirmed,
  view: renderView,
});

const transact = (fn) => state.swap(fn);

const formatDateTime = (x) =>
  x?.toLocaleString("cs", { dateStyle: "short", timeStyle: "short" }) ?? null;
const sortByTimestamp = (x) =>
  x.sort((a, b) => -1 * a.timestamp.localeCompare(b.timestamp));

function chips(view, { hackers, waitingList, plusOnes, hackersConfirmed }) {
  return html`<span
    class="mdc-evolution-chip-set"
    role="grid"
    id="filters"
    aria-orientation="horizontal"
    aria-multiselectable="false"
  >
    <span class="mdc-evolution-chip-set__chips" role="presentation">
      <span
        class="${classMap({
          "mdc-evolution-chip": true,
          "mdc-evolution-chip--selectable": true,
          "mdc-evolution-chip--filter": true,
          "hc-chip": true,
          "hc-chip--selected": view === View.hackersConfirmed,
        })}"
        role="presentation"
      >
        <a
          class="mdc-evolution-chip__action mdc-evolution-chip__action--primary"
          role="option"
          aria-selected="${view === View.hackersConfirmed ? "true" : "false"}"
          tabindex="0"
          href="?view=${View.hackersConfirmed}"
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
          <span class="mdc-evolution-chip__text-label"
            >Potvrzení Hackeři
            ${when(
              hackersConfirmed,
              () =>
                html`<data value="${hackersConfirmed}"
                  >${hackersConfirmed}</data
                >`
            )}</span
          >
        </a>
      </span>
      <span
        class="${classMap({
          "mdc-evolution-chip": true,
          "mdc-evolution-chip--selectable": true,
          "mdc-evolution-chip--filter": true,
          "hc-chip": true,
          "hc-chip--selected": view === View.hackers,
        })}"
        role="presentation"
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
          <span class="mdc-evolution-chip__text-label"
            >Hackeři
            ${when(
              hackers,
              () => html`<data value="${hackers}">${hackers}</data>`
            )}</span
          >
        </a>
      </span>
      <span
        class="${classMap({
          "mdc-evolution-chip": true,
          "mdc-evolution-chip--selectable": true,
          "mdc-evolution-chip--filter": true,
          "hc-chip": true,
          "hc-chip--selected": view === View.plusOnes,
        })}"
        role="presentation"
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
          <span class="mdc-evolution-chip__text-label"
            >Plus Ones
            ${when(
              plusOnes,
              () => html`<data value="${plusOnes}">${plusOnes}</data>`
            )}</span
          >
        </a>
      </span>
      <span
        class="${classMap({
          "mdc-evolution-chip": true,
          "mdc-evolution-chip--selectable": true,
          "mdc-evolution-chip--filter": true,
          "hc-chip": true,
          "hc-chip--selected": view === View.waitingList,
        })}"
        role="presentation"
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
          <span class="mdc-evolution-chip__text-label"
            >Waiting List
            ${when(
              waitingList,
              () => html`<data value="${waitingList}">${waitingList}</data>`
            )}</span
          >
        </a>
      </span>
    </span>
  </span>`;
}

const housing = new Map([
  ["own-car", "Přijede autem a bude v něm i spát"],
  ["own-caravan", "Přiveze si vlastní karavan, ve kterém chce spát"],
  ["open-air", "Bude spát pod širákem nebo v hamace"],
  ["own-tent", "Bude spát ve stanu"],
  ["glamping", "Bude spát v Glamping stanu"],
  ["cottage", "Bude spát v chatce"],
  ["nearby", "Využije možnost ubytování v okolí"],
]);

const travel = new Map([
  ["full-car", "Přijede autem a jsou full"],
  ["free-car", "Přijede autem a nabídne spolujízdu"],
  ["carpool", "S někým  se sveze"],
  ["bus", "Chce jet Hacker busem z Brna a okolí!"],
  ["no-car", "Nejede autem (využije bus, vlak, kolo, pěškobus)"],
  ["no-car-but-info", "Nejedu autem, ale zajímá ho shuttlebus"],
]);

const ticketBadge = new Map([
  [
    "nonprofit",
    svg`
      <svg
        class="hc-price-list__badge"
        width="24"
        height="24"
        viewBox="0 0 66 66"
        fill="none"
         xmlns="http://www.w3.org/2000/svg">
        <title>Táborník z neziskovky</title>
        <g clip-path="url(#item1_clip0)">
          <rect width="66" height="66" rx="20" fill="url(#paint5_linear)" />
          <circle opacity="0.23" cx="52" cy="11" r="17" fill="white" />
          <circle opacity="0.23" cx="11" cy="55" r="24" fill="white" />
        </g>
        <defs>
          <linearGradient id="paint5_linear" x1="2.55465e-06" y1="-8" x2="66" y2="73.5"
                          gradientUnits="userSpaceOnUse">
            <stop stop-color="#E0E0E0" />
            <stop offset="1" stop-color="#BEBEBE" />
          </linearGradient>
          <clipPath id="item1_clip0">
            <rect width="66" height="66" rx="20" fill="white" />
          </clipPath>
        </defs>
      </svg>
    `,
  ],
  [
    "hacker",
    svg`
      <svg
        class="hc-price-list__badge"
        width="24"
        height="24"
        viewBox="0 0 66 66"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <title>Hacker</title>
        <g clip-path="url(#item2_clip0)">
          <rect width="66" height="66" rx="20" fill="url(#paint6_linear)" />
          <circle opacity="0.23" cx="52" cy="11" r="17" fill="url(#paint1_linear)" />
          <circle opacity="0.23" cx="11" cy="55" r="24" fill="url(#paint2_linear)" />
        </g>
        <defs>
          <linearGradient id="paint6_linear" x1="2.55465e-06" y1="-8" x2="66" y2="73.5"
                          gradientUnits="userSpaceOnUse">
            <stop stop-color="#E0E0E0" />
            <stop offset="1" stop-color="#BEBEBE" />
          </linearGradient>
          <linearGradient id="paint1_linear" x1="33.0682" y1="21.0455" x2="85.2184" y2="11.0029"
                          gradientUnits="userSpaceOnUse">
            <stop stop-color="#EE771B" />
            <stop offset="0.4271" stop-color="#E62271" />
            <stop offset="0.7889" stop-color="#684997" />
            <stop offset="1" stop-color="#3E7ABC" />
          </linearGradient>
          <linearGradient id="paint2_linear" x1="-15.7273" y1="69.1818" x2="57.8966" y2="55.0041"
                          gradientUnits="userSpaceOnUse">
            <stop stop-color="#EE771B" />
            <stop offset="0.4271" stop-color="#E62271" />
            <stop offset="0.7889" stop-color="#684997" />
            <stop offset="1" stop-color="#3E7ABC" />
          </linearGradient>
          <clipPath id="item2_clip0">
            <rect width="66" height="66" rx="20" fill="white" />
          </clipPath>
        </defs>
      </svg>
    `,
  ],
  [
    "hacker-plus",
    svg`
      <svg
        class="hc-price-list__badge"
        width="24" height="24" viewBox="0 0 66 66" fill="none" xmlns="http://www.w3.org/2000/svg">
        <title>Hacker filantrop</title>
        <g clip-path="url(#item3_clip0)">
          <rect width="66" height="66" rx="20" fill="url(#paint3_linear)" />
          <circle opacity="0.23" cx="52" cy="11" r="17" fill="white" />
          <circle opacity="0.23" cx="11" cy="55" r="24" fill="white" />
        </g>
        <defs>
          <linearGradient id="paint3_linear" x1="-3.75" y1="52.5" x2="97.4828" y2="33.0057"
                          gradientUnits="userSpaceOnUse">
            <stop stop-color="#EE771B" />
            <stop offset="0.4271" stop-color="#E62271" />
            <stop offset="0.7889" stop-color="#684997" />
            <stop offset="1" stop-color="#3E7ABC" />
          </linearGradient>
          <clipPath id="item3_clip0">
            <rect width="66" height="66" rx="20" fill="white" />
          </clipPath>
        </defs>
      </svg>
    `,
  ],
  [
    "hacker-patron",
    svg`
      <svg
        class="hc-price-list__badge"
        width="24" height="24" viewBox="0 0 66 66" fill="none" xmlns="http://www.w3.org/2000/svg">
        <title>Patron Campu</title>
        <g clip-path="url(#item4_clip0)">
          <rect width="66" height="66" rx="20" fill="url(#paint10_linear)" />
          <circle opacity="0.23" cx="52" cy="11" r="17" fill="white" />
          <circle opacity="0.23" cx="11" cy="55" r="24" fill="white" />
        </g>
        <defs>
          <linearGradient id="paint10_linear" x1="-3.75" y1="52.5" x2="97.4828" y2="33.0057"
                          gradientUnits="userSpaceOnUse">
            <stop stop-color="#FDF59A" />
            <stop offset="0.498264" stop-color="#F1CF5D" />
            <stop offset="1" stop-color="#E1BB49" />
          </linearGradient>
          <clipPath id="item4_clip0">
            <rect width="66" height="66" rx="20" fill="white" />
          </clipPath>
        </defs>
      </svg>
    `,
  ],
]);

function detailTemplate(detail) {
  if (!detail) return null;
  return html`
    <div class="hc-card hc-master-detail__detail"">
      <h2>${detail.firstName} ${detail.lastName}</h2>
      <p>${detail.company}</p>
      <div class="hc-detail__tools">
        <a
          href="mailto:${detail.email}"
          title="Napsat ${detail.email}""><svg
        xmlns="http://www.w3.org/2000/svg"
        height="24"
        width="24"
      >
        <path d="M0 0h24v24H0z" fill="none"/>
        <path
          fill="var(--hc-text-color)"
          d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"
        />
      </svg></a>
        <a
          href="tel:${detail.phone.replace(" ", "")}"
          title="Zavolat ${detail.phone}"><svg
          xmlns="http://www.w3.org/2000/svg"
          height="24"
          width="24"
        >
          <path d="M0 0h24v24H0z" fill="none"/>
          <path
            fill="var(--hc-text-color)"
            d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
          />
        </svg></a>

        ${ticketBadge.get(detail.ticketType)}
      </div>
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
        detail.address,
        () => html`
          <address style="border: 1px solid #ddd">
            <p>${detail.address}</p>
          </address>
        `
      )}
      ${when(
        detail.activity,
        () => html`
          <h3>Aktivita</h3>
          ${unsafeHTML(marked.parse(detail.activity))}
          <p>${detail.activityCrew}</p>
          <p>${detail.activityPlace}</p>
        `
      )}
    </div>
  `;
}

const renderDetail = (detail) => () =>
  transact((x) => Object.assign(x, { detail }));

function renderTable(data, { view, detail }) {
  const showDetail = Boolean(detail);
  return html`
    <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
      ${chips(view, { [view]: data.length })}
    </div>
    <div
      class="hc-master-detail mdc-layout-grid__cell mdc-layout-grid__cell--span-12"
    >
      <div class="hc-card hc-master-detail__list">
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
                <tr
                  @click="${renderDetail(row)}">
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
                        fill="var(--hc-text-color)"
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
                          fill="var(--hc-text-color)"
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
      ${when(showDetail, () => detailTemplate(detail))}
    </div>
  `;
}

function renderView(state) {
  return html`
    <div id="top" class="mdc-layout-grid">
      <div class="mdc-layout-grid__inner">
        ${until(
          state.data?.then((x) =>
            renderTable(sortByTimestamp(x), {
              view: state.selectedView,
              detail: state.detail,
            })
          ),
          html`
            <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
              <p>Načítám data&hellip;</p>
            </div>
          `
        )}
      </div>
    </div>
  `;
}

/**
 *
 * @param {URLSearchParams} searchParams
 */
function loadData(searchParams) {
  const selectedView = searchParams.get("view") ?? View.hackersConfirmed;
  transact((x) =>
    Object.assign(x, {
      selectedView,
      data: fetch(
        `https://api.hackercamp.cz/v1/admin/registrations?type=${selectedView}`
      ).then((resp) => resp.json()),
    })
  );
}

export async function main({ appRoot, searchParams, env }) {
  initRenderLoop(state, appRoot);
  loadData(searchParams);
}
