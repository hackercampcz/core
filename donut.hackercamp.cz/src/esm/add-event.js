import { defAtom } from "@thi.ng/atom";
import { html } from "lit-html";
import { initRenderLoop } from "./lib/renderer.js";

export const state = defAtom({
  view: renderAddEvent,
  year: 2022,
  apiUrl: "",
  profile: {},
});
const transact = (fn) => state.swap(fn);

const HEADER_BY_LINEUP = new Map([
  ["", html`<em>nah.</em>`],
  [
    "limain",
    html`<h2>Talk / Přednáška / Diskuse</h2>
      <p>Data. Dev. Hacks.</p>`,
  ],
  [
    "libase",
    html`<h2>Basecamp</h2>
      <p>Byznys. Life. NGOs. BioHacks. Byznys stories</p>`,
  ],
  [
    "liback",
    html`<h2>Backend</h2>
      <p>Workshops</p>`,
  ],
  [
    "lipeep",
    html`<h2>PeopleWare</h2>
      <p>Sport / Meditace</p>`,
  ],
  [
    "liwood",
    html`<h2>WoodStack / Jungle release</h2>
      <p>Hudební program</p>`,
  ],
  [
    "liother",
    html`<h2>Doprovodný program</h2>
      <p>Další / jiný doprovodný program</p>`,
  ],
]);

const FIELDS_BY_LINEUP = new Map([
  ["", html`<em>nah.</em>`, ""],
  [
    "limain",
    html`
      <div class="field">
        <label for="title">Název přednášky, anotace </label>
        <input id="title" name="title" type="text" required />
      </div>
      <div class="group">
        <div class="field">
          <label for="duration">Délka talku v minutách</label>
          <input
            id="duration"
            name="duration"
            type="number"
            min="15"
            max="120"
            value="15"
            required
          />
        </div>
        <div class="field" style="flex: 2">
          <label for="buddy">Parťák (nepovinnej)</label>
          <input id="buddy" name="buddy" type="text" />
        </div>
      </div>
    `,
  ],
  [
    "libase",
    html`
      <div class="field">
        <label for="title">Název workshopu, anotace </label>
        <input id="title" name="title" type="text" required />
      </div>
      <div class="group">
        <div class="field">
          <label for="duration">Délka v minutách</label>
          <input
            id="duration"
            name="duration"
            type="number"
            min="15"
            max="120"
            value="90"
            required
          />
        </div>
        <div class="field" style="flex: 2">
          <label for="buddy">Parťák (nepovinnej)</label>
          <input id="buddy" name="buddy" type="text" />
        </div>
      </div>
    `,
  ],
  ["limain", html`<em>copy of libase.</em>`],
  [
    "liback",
    html`
      <div class="field">
        <label for="title">Název workshopu, anotace </label>
        <input id="title" name="title" type="text" required />
      </div>
      <div class="group">
        <div class="field">
          <label for="duration">Délka v minutách</label>
          <input
            id="duration"
            name="duration"
            type="number"
            min="15"
            max="120"
            value="90"
            required
          />
        </div>
        <div class="field" style="flex: 2">
          <label for="buddy">Parťák (nepovinnej)</label>
          <input id="buddy" name="buddy" type="text" />
        </div>
      </div>
    `,
  ],
  [
    "liother",
    html`
      <div class="field">
        <label for="title"
          >Název aktivity, anotace (co si pod tím představit)</label
        >
        <input id="title" name="title" type="text" required />
      </div>
      <div class="group">
        <div class="field">
          <label for="duration">Délka</label>
          <input
            id="duration"
            name="duration"
            type="number"
            min="15"
            max="120"
            value="60"
            required
          />
        </div>
        <div class="field" style="flex: 2">
          <label for="buddy">Parťák (nepovinnej)</label>
          <input id="buddy" name="buddy" type="text" />
        </div>
      </div>
      <div class="field field--block">
        <label for="demands"> Máš specifické požadavky, aby to klaplo? </label>
        <textarea id="demands" name="demands" rows="5"></textarea>
      </div>
      <div class="field">
        <label for="palce"
          >Místo, kde se sejdete / kde se aktivta bude kontat</label
        >
        <input id="palce" name="palce" type="text" required />
      </div>
    `,
  ],
  ["lijungle", html`<em>liwood copy</em>`],
  [
    "lipeep",
    html` <div class="field">
        <label for="title"
          >Název aktivity, anotace (co si pod tím představit)</label
        >
        <input id="title" name="title" type="text" required />
      </div>
      <div class="group">
        <div class="field">
          <label for="duration">Délka v minutách</label>
          <input
            id="duration"
            name="duration"
            type="number"
            min="15"
            max="120"
            value="60"
            required
          />
        </div>
        <div class="field" style="flex: 2">
          <label for="buddy">Parťák (nepovinnej)</label>
          <input id="buddy" name="buddy" type="text" />
        </div>
      </div>
      <div class="field">
        <label for="palce"
          >Místo, kde se sejdete / kde se aktivta bude kontat</label
        >
        <input id="palce" name="palce" type="text" required />
      </div>`,
  ],
  [
    "liwood",
    html`
      <div class="field">
        <label for="name">DJ name / umělecké jméno</label>
        <input id="name" name="name" type="text" required />
      </div>
      <div class="field field--block">
        <label for="performance">
          Popiš svoje vystoupení (žánr, solo / kapela / hudební těleso)
        </label>
        <textarea id="performance" name="performance" rows="5"></textarea>
      </div>
      <div class="group">
        <div class="field">
          <label for="duration">Délka</label>
          <input
            id="duration"
            name="duration"
            type="number"
            min="15"
            max="120"
            value="60"
            required
          />
        </div>
        <div class="field" style="flex: 2">
          <label for="buddy">Parťák (nepovinnej)</label>
          <input id="buddy" name="buddy" type="text" />
        </div>
      </div>
    `,
  ],
]);
FIELDS_BY_LINEUP.set("lijungle", FIELDS_BY_LINEUP.get("liwood"));
FIELDS_BY_LINEUP.set("limain", FIELDS_BY_LINEUP.get("libase"));

export function renderSignpost() {
  return html`
    <h2>Jakým způsobem se do programu zapojíš?</h2>
    <section class="event-type">
      <div class="hc-card hc-card--decorated">
        <h3>Talk / Přednáška / Diskuse</h3>
        <div>
          <p>Byznys. Life. NGOs. BioHacks. Byznys stories</p>
          <a
            class="hc-link--decorated"
            href="#"
            @click=${(event) => {
              event.preventDefault();
              transact((x) =>
                Object.assign(x, { view: renderAddEvent, lineupId: "limain" })
              );
            }}
            >Mainframe</a
          >
        </div>
        <div>
          <p>Data. Dev. Hacks.</p>
          <a
            class="hc-link--decorated"
            href="#"
            @click=${(event) => {
              event.preventDefault();
              transact((x) =>
                Object.assign(x, { view: renderAddEvent, lineupId: "libase" })
              );
            }}
            >Basecamp</a
          >
        </div>
      </div>
      <div class="hc-card hc-card--decorated">
        <h3>Workshop</h3>
        <a
          class="hc-link--decorated"
          href="#"
          @click=${(event) => {
            event.preventDefault();
            transact((x) =>
              Object.assign(x, { view: renderAddEvent, lineupId: "liback" })
            );
          }}
          >Backend</a
        >
      </div>
      <div class="hc-card hc-card--decorated">
        <h3>Sport / Meditace</h3>
        <a
          class="hc-link--decorated"
          href="#"
          @click=${(event) => {
            event.preventDefault();
            transact((x) =>
              Object.assign(x, { view: renderAddEvent, lineupId: "lipeep" })
            );
          }}
          >PeopleWare</a
        >
      </div>
      <div class="hc-card hc-card--decorated">
        <h3>Hudební program</h3>
        <a
          class="hc-link--decorated"
          href="#"
          @click=${(event) => {
            event.preventDefault();
            transact((x) =>
              Object.assign(x, { view: renderAddEvent, lineupId: "liwood" })
            );
          }}
          >WoodStack /<br />Jungle release</a
        >
      </div>
      <div class="hc-card hc-card--decorated">
        <h3>Další / jiný doprovodný program</h3>
        <a
          class="hc-link--decorated"
          href="#"
          @click=${(event) => {
            event.preventDefault();
            transact((x) =>
              Object.assign(x, { view: renderAddEvent, lineupId: "liother" })
            );
          }}
          >Doprovodný program</a
        >
      </div>
    </section>
    <hr />
    <button name="close">Zavřít</button>
  `;
}

function renderAddEvent({ lineupId, profile, year, apiUrl }) {
  const headHtml = HEADER_BY_LINEUP.get(lineupId);
  const fieldsHtml = FIELDS_BY_LINEUP.get(lineupId);
  return html`
    ${headHtml}
    <form method="post" action="${apiUrl}program">
      <input type="hidden" name="lineup" value=${lineupId} />
      <input type="hidden" name="slackID" value=${profile.sud} />
      <input type="hidden" name="year" value=${year} />
      ${fieldsHtml}
    </form>
    <button type="submit" class="hc-button">Odeslat to</button>
    <hr />
    <button name="close" type="reset">Zavřít</button>
  `;
}

export function init(rootElement, { apiUrl, profile, lineupId }) {
  initRenderLoop(state, rootElement);
  const view = lineupId ? renderAddEvent : renderSignpost;
  transact((x) => Object.assign(x, { view, apiUrl, profile, lineupId }));
}
