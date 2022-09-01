import { defAtom } from "@thi.ng/atom";
import { html } from "lit-html";
import { initRenderLoop } from "./lib/renderer.js";
import * as rollbar from "./lib/rollbar.js";
import { when } from "lit/directives/when.js";

export const state = defAtom({
  view: renderAddEventForm,
  year: 2022,
  apiUrl: "",
  profile: {},
});
const transact = (fn) => state.swap(fn);

const HEADER_BY_LINEUP = new Map([
  ["", html`<em>nah.</em>`],
  [
    "limain",
    html`<h2>Mainframe</h2>
      <p>Data. Dev. Hacks.</p>`,
  ],
  [
    "libase",
    html`<h2>Basecamp</h2>
      <p>Data. Devs. BI. Code.</p>`,
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
    "lijungle",
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
    ({
      lineupTopicEvents,
      selectedTopic,
    }) => html`
      <div class="field">
        <label for="topic">Téma přednášky / talku</label>
        <select
          id="topic"
          name="topic"
          type="text"
          required
          style="font-weight: bold;"
          @change=${(event) => {
            transact((x) =>
              Object.assign(x, { selectedTopic: event.target.value })
            );
          }}
        >
          <option value="" disabled ?selected=${!selectedTopic}>
            Vyberte vaše téma
          </option>
          ${lineupTopicEvents.map(
            (topic) =>
              html`<option
                value=${topic.id}
                ?selected=${selectedTopic && selectedTopic === topic.id}
              >
                ${topic.title}
              </option>`
          )}
        </select>
      </div>
      ${when(
        selectedTopic,
        () =>
          html`<p style="font-style: italic;">
            ${lineupTopicEvents.find(({ id }) => id === selectedTopic)
              ?.description}
          </p>`
      )}
      <div style=${`display: ${selectedTopic ? "block" : "none"}`}>
        <div class="field">
          <label for="title">Název přednášky</label>
          <input id="title" name="title" type="text" required />
        </div>
        <div class="field">
          <label for="description">Anotace aneb rozepíšeš se víc?</label>
          <textarea
            id="description"
            name="description"
            type="text"
            rows="5"
          ></textarea>
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
        </div>
        <div class="field">
          <label for="buddy">Parťák (nepovinnej)</label>
          <input id="buddy" name="buddy" type="text" />
        </div>
        <button type="submit" class="hc-button">Odeslat to</button>
      </div>
    `,
  ],
  ["libase", () => html`<em>copy of limain.</em>`],
  [
    "liback",
    ({ campStartAt, campEndAt, preferredTime }) => html`
      <div class="field">
        <label for="title">Název workshopu </label>
        <input id="title" name="title" type="text" required />
      </div>
      <div class="field">
        <label for="description">Anotace aneb rozepíšeš se víc?</label>
        <textarea
          id="description"
          name="description"
          type="text"
          rows="4"
        ></textarea>
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
          <label for="preferred-time">Preferovaný čas</label>
          <input
            id="preferred-time"
            name="startAt"
            type="datetime-local"
            value=${preferredTime?.toISOString().replace("Z", "")}
            min=${campStartAt.toISOString().replace("Z", "")}
            max=${campEndAt.toISOString().replace("Z", "")}
          />
        </div>
      </div>
      <div class="field">
        <label for="buddy">Parťák (nepovinnej)</label>
        <input id="buddy" name="buddy" type="text" />
      </div>
      <button type="submit" class="hc-button">Odeslat to</button>
    `,
  ],
  [
    "liother",
    ({ campStartAt, campEndAt, preferredTime }) => html`
      <div class="field">
        <label for="title"
          >Název aktivity, anotace (co si pod tím představit)</label
        >
        <input id="title" name="title" type="text" required />
      </div>
      <div class="field">
        <label for="description">Anotace aneb co si pod tím představit?</label>
        <textarea
          id="description"
          name="description"
          type="text"
          rows="4"
        ></textarea>
      </div>
      <div class="group">
        <div class="field">
          <label for="duration">Délka (minuty)</label>
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
          <label for="preferred-time">Preferovaný čas</label>
          <input
            id="preferred-time"
            name="startAt"
            type="datetime-local"
            value=${preferredTime?.toISOString().replace("Z", "")}
            min=${campStartAt.toISOString().replace("Z", "")}
            max=${campEndAt.toISOString().replace("Z", "")}
          />
        </div>
      </div>
      <div class="field">
        <label for="buddy">Parťák (nepovinnej)</label>
        <input id="buddy" name="buddy" type="text" />
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
      <button type="submit" class="hc-button">Odeslat to</button>
    `,
  ],
  ["lijungle", html`<em>liwood copy</em>`],
  [
    "lipeep",
    ({ preferredTime, campStartAt, campEndAt }) => html`
      <div class="field">
        <label for="title">Název aktivity</label>
        <input id="title" name="title" type="text" required />
      </div>
      <div class="field">
        <label for="description">Anotace aneb co si pod tím představit?</label>
        <textarea
          id="description"
          name="description"
          type="text"
          rows="4"
        ></textarea>
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
          <label for="preferred-time">Preferovaný čas</label>
          <input
            id="preferred-time"
            name="startAt"
            type="datetime-local"
            .value=${preferredTime?.toISOString().replace("Z", "")}
            min=${campStartAt.toISOString().replace("Z", "")}
            max=${campEndAt.toISOString().replace("Z", "")}
          />
        </div>
      </div>
      <div class="field">
        <label for="buddy">Parťák (nepovinnej)</label>
        <input id="buddy" name="buddy" type="text" />
      </div>
      <div class="field">
        <label for="palce"
          >Místo, kde se sejdete / kde se aktivta bude kontat</label
        >
        <input id="palce" name="palce" type="text" required />
      </div>
      <button type="submit" class="hc-button">Odeslat to</button>
    `,
  ],
  [
    "liwood",
    ({ selectedTopic, lineupTopicEvents }) => html`
      <div class="field">
        <label for="topic">Téma přednášky / talku</label>
        <select
          id="topic"
          name="topic"
          type="text"
          required
          style="font-weight: bold;"
          @change=${(event) => {
            transact((x) =>
              Object.assign(x, { selectedTopic: event.target.value })
            );
          }}
        >
          <option value="" disabled ?selected=${!selectedTopic}>
            Vyberte vaše téma
          </option>
          ${lineupTopicEvents.map(
            (topic) =>
              html`<option
                value=${topic.id}
                ?selected=${selectedTopic && selectedTopic === topic.id}
              >
                ${topic.title}
              </option>`
          )}
        </select>
      </div>
      <p>
        ${lineupTopicEvents.find(({ id }) => id === selectedTopic)?.description}
      </p>
      <div style=${`display: ${selectedTopic ? "block" : "none"}`}>
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
        <button type="submit" class="hc-button">Odeslat to</button>
      </div>
    `,
  ],
]);
FIELDS_BY_LINEUP.set("lijungle", FIELDS_BY_LINEUP.get("liwood"));
FIELDS_BY_LINEUP.set("libase", FIELDS_BY_LINEUP.get("limain"));

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
                Object.assign(x, {
                  view: renderAddEventForm,
                  lineupId: "limain",
                })
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
                Object.assign(x, {
                  view: renderAddEventForm,
                  lineupId: "libase",
                })
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
              Object.assign(x, { view: renderAddEventForm, lineupId: "liback" })
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
              Object.assign(x, { view: renderAddEventForm, lineupId: "lipeep" })
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
              Object.assign(x, { view: renderAddEventForm, lineupId: "liwood" })
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
              Object.assign(x, {
                view: renderAddEventForm,
                lineupId: "liother",
              })
            );
          }}
          >Doprovodný program</a
        >
      </div>
    </section>
  `;
}

export function renderAddEventForm({
  lineupId,
  profile,
  year,
  apiUrl,
  header,
  campStartAt,
  campEndAt,
  preferredTime,
  hackers = [],
  events = [],
  selectedTopic,
}) {
  const headHtml = header ?? HEADER_BY_LINEUP.get(lineupId);
  const fieldsHtml = FIELDS_BY_LINEUP.get(lineupId)({
    campStartAt,
    campEndAt,
    preferredTime,
    lineupTopicEvents: events.filter(
      ({ lineup, type }) => lineup === lineupId && type === "topic"
    ),
    selectedTopic,
  });

  return html`
    ${headHtml}
    <form method="post" action="${apiUrl}program">
      <input type="hidden" name="lineup" value=${lineupId} />
      ${when(
        hackers.length,
        () => html`<div class="field">
          <input
            list="hackers"
            name="slackID"
            type="search"
            value=${profile.sub}
          />
          <datalist id="hackers">
            ${hackers.map(
              (hacker) => html`
                <option value=${hacker.slackID}>${hacker.name}</option>
              `
            )}
          </datalist>
        </div>`,
        () => html`<input type="hidden" name="slackID" value=${profile.sub} />`
      )}
      <input type="hidden" name="year" value=${year} />
      <input type="hidden" name="timezone" value="+02:00" />
      ${fieldsHtml}
    </form>
  `;
}

export async function renderInit(
  rootElement,
  {
    apiUrl,
    profile,
    lineupId,
    header,
    startAt: campStartAt,
    preferredTime,
    hijackHacker = false, // mby change to hackers[] that are passed
    events = [],
    selectedTopic,
  }
) {
  initRenderLoop(state, rootElement);
  const view = lineupId ? renderAddEventForm : renderSignpost;

  transact((x) =>
    Object.assign(x, {
      header,
      view,
      apiUrl,
      profile,
      lineupId,
      campStartAt,
      preferredTime,
      events,
      selectedTopic,
    })
  );

  if (hijackHacker) {
    try {
      const response = await fetch(`${apiUrl}housing?year=2022`, {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const housing = await response.json();
      const hackers = housing.map(({ name, slackID }) => ({
        name,
        slackID,
      }));
      transact((x) => Object.assign(x, { hackers }));
    } catch (o_O) {
      rollbar.error(o_O);
      snackbar.labelText = "Chyba při načítání hackerů";
      snackbar.show();
    }
  }
}
