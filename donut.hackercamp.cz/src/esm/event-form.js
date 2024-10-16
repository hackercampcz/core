import { defAtom, updateAsTransaction } from "@thi.ng/atom";
import { html } from "lit-html";
import { when } from "lit-html/directives/when.js";
import { setReturnUrl, signOut } from "./lib/profile.js";
import { withAuthHandler } from "./lib/remoting.js";
import { initRenderLoop } from "./lib/renderer.js";
import * as rollbar from "./lib/rollbar.js";

/** @typedef {import("@thi.ng/atom").IAtom} IAtom */
/** @typedef {import("@thi.ng/atom").Path} Path */
/** @typedef {import("@thi.ng/atom").SwapFn} SwapFn */

const state = defAtom({ view: signpostTemplate, year: 2023, apiHost: "", profile: {} });

/**
 * @param {SwapFn<T, T>} fn
 * @param {IAtom<T>} [atom]
 */
const transact = (fn, atom = state) => atom.swap(fn);
/**
 * @param {Path} path
 * @param {SwapFn<T, T>} fn
 * @param {IAtom<T>} [atom]
 */
const swapIn = (path, fn, atom = state) => atom.swapInUnsafe(path, fn);
const transaction = (fn, atom = state) => updateAsTransaction(atom, fn);

if (globalThis.__DEVELOPMENT__) {
  globalThis.transact = transact;
  globalThis.swapIn = swapIn;
  globalThis.getState = () => state.deref();
}

const eventFormStyles = html`
  <style>
    .event-type {
      display: flex;
      flex-direction: column;
      gap: var(--spacing);
    }
    .event-type .hc-card p {
      text-align: left;
      margin-top: var(--spacing);
    }
    .event-type .hc-link--decorated {
      display: block;
      width: auto;
      position: relative;
    }
    .event-type .hc-link--decorated::after {
      content: "⇨";
      display: block;
      float: right;
      font-size: 32px;
      line-height: calc(16px * 1.5);
    }
  </style>
`;

const lineupHeadersTemplates = new Map([["", html`<em>nah.</em>`], [
  "limain",
  html`<h2>Mainframe</h2>
      <p>Data. Dev. Hacks.</p>`
], [
  "libase",
  html`<h2>Basecamp</h2>
      <p>Data. Devs. BI. Code.</p>`
], [
  "liback",
  html`<h2>Backend</h2>
      <p>Workshops</p>`
], [
  "lipeep",
  html`<h2>PeopleWare</h2>
      <p>Sport / Meditace</p>`
], [
  "liwood",
  html`<h2>WoodStack / Jungle release</h2>
      <p>Hudební program</p>`
], [
  "lijungle",
  html`<h2>WoodStack / Jungle release</h2>
      <p>Hudební program</p>`
], [
  "liother",
  html`<h2>Doprovodný program</h2>
      <p>Další / jiný doprovodný program</p>`
]]);

const lineupsFieldsTemplates = new Map([
  ["", html`<em>nah.</em>`, ""],
  ["limain", ({ lineupTopicEvents, selectedTopic, editingEvent }) =>
    html`
      <div class="field">
        <label for="topic">Téma přednášky / talku</label>
        <select
          id="topic"
          name="topic"
          type="text"
          required
          style="font-weight: bold;"
          ?readonly=${Boolean(editingEvent?.topic)}
          @change=${(e) => swapIn("selectedTopic", () => e.target.value)}
        >
          <option value="" disabled ?selected=${!selectedTopic}>
            Vyberte vaše téma
          </option>
          ${
      lineupTopicEvents.map((topic) =>
        html`<option
                value=${topic.id}
                ?selected=${selectedTopic && selectedTopic === topic.id}
              >
                ${topic.title}
              </option>`
      )
    }
        </select>
      </div>
      ${
      when(selectedTopic, () =>
        html`<p style="font-style: italic;">
            ${lineupTopicEvents.find(({ id }) => id === selectedTopic)?.description}
          </p>`)
    }
      <div
        style=${`display: ${selectedTopic || editingEvent ? "block" : "none"}`}
      >
        <div class="field">
          <label for="title">Název přednášky</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            .value=${editingEvent?.title || ""}
          />
        </div>
        <div class="field">
          <label for="description">Anotace aneb rozepíšeš se víc?</label>
          <textarea
            id="description"
            name="description"
            type="text"
            rows="5"
            .value=${editingEvent?.description || ""}
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
              .value=${editingEvent?.title || "15"}
              required
            />
          </div>
        </div>
        <div class="field">
          <label for="buddy">Parťák (nepovinnej)</label>
          <input
            id="buddy"
            name="buddy"
            type="text"
            .value=${editingEvent?.buddy || ""}
          />
        </div>
        <button type="submit" class="hc-button">Odeslat to</button>
      </div>
    `],
  ["libase", () => html`<em>copy of limain.</em>`],
  ["liback", ({ campStartAt, campEndAt, preferredTime }) =>
    html`
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
    `],
  ["liother", ({ campStartAt, campEndAt, preferredTime, editingEvent }) =>
    console.log(editingEvent) || html`
        <div class="field">
          <label for="title"
            >Název aktivity, anotace (co si pod tím představit)</label
          >
          <input
            id="title"
            name="title"
            type="text"
            required
            .value=${editingEvent?.title || ""}
          />
        </div>
        <div class="field">
          <label for="description"
            >Anotace aneb co si pod tím představit?</label
          >
          <textarea
            id="description"
            name="description"
            type="text"
            rows="4"
            .value=${editingEvent?.description || ""}
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
              .value=${editingEvent?.duration || "60"}
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
          <input
            id="buddy"
            name="buddy"
            type="text"
            .value=${editingEvent?.buddy || ""}
          />
        </div>
        <div class="field field--block">
          <label for="demands">
            Máš specifické požadavky, aby to klaplo?
          </label>
          <textarea
            id="demands"
            name="demands"
            rows="5"
            .value=${editingEvent?.demands || ""}
          ></textarea>
        </div>
        <div class="field">
          <label for="place"
            >Místo, kde se sejdete / kde se aktivta bude kontat</label
          >
          <input
            id="place"
            name="place"
            type="text"
            .value=${editingEvent?.place || ""}
            required
          />
        </div>
        <button type="submit" class="hc-button">Odeslat to</button>
      `],
  ["lijungle", html`<em>liwood copy</em>`],
  ["lipeep", ({ preferredTime, campStartAt, campEndAt, editingEvent }) =>
    html`
      <div class="field">
        <label for="title">Název aktivity</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          .value=${editingEvent?.title || ""}
        />
      </div>
      <div class="field">
        <label for="description">Anotace aneb co si pod tím představit?</label>
        <textarea
          id="description"
          name="description"
          type="text"
          rows="4"
          .value=${editingEvent?.description || ""}
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
            value=${editingEvent?.description || "60"}
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
        <input
          id="buddy"
          name="buddy"
          type="text"
          .value=${editingEvent?.buddy || "60"}
        />
      </div>
      <div class="field">
        <label for="place"
          >Místo, kde se sejdete / kde se aktivta bude kontat</label
        >
        <input
          id="place"
          name="place"
          type="text"
          required
          .value=${editingEvent?.place || "60"}
        />
      </div>
      <button type="submit" class="hc-button">Odeslat to</button>
    `],
  ["liwood", ({ selectedTopic, lineupTopicEvents, editingEvent }) =>
    html`
      <div class="field">
        <label for="topic">Téma přednášky / talku</label>
        <select
          id="topic"
          name="topic"
          type="text"
          required
          style="font-weight: bold;"
          ?readonly=${Boolean(editingEvent?.topic)}
          @change=${(e) => swapIn("selectedTopic", () => e.target.value)}
        >
          <option value="" disabled ?selected=${!selectedTopic}>
            Vyberte vaše téma
          </option>
          ${
      lineupTopicEvents.map((topic) =>
        html`<option
                value=${topic.id}
                ?selected=${selectedTopic && selectedTopic === topic.id}
              >
                ${topic.title}
              </option>`
      )
    }
        </select>
      </div>
      <p>
        ${lineupTopicEvents.find(({ id }) => id === selectedTopic)?.description}
      </p>
      <div
        style=${`display: ${selectedTopic || editingEvent ? "block" : "none"}`}
      >
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
    `],
  ["liorg", ({ selectedTopic, lineupTopicEvents, preferredTime }) => html`<em>copy of liother</em>`]
]);
lineupsFieldsTemplates.set("lijungle", lineupsFieldsTemplates.get("liwood"));
lineupsFieldsTemplates.set("libase", lineupsFieldsTemplates.get("limain"));
lineupsFieldsTemplates.set("liorg", lineupsFieldsTemplates.get("liother"));

function showLineupEventForm(lineupId) {
  transaction((t) => {
    swapIn("view", () => eventFormTemplate, t);
    swapIn("lineupId", () => lineupId, t);
    return true;
  });
}

export function signpostTemplate() {
  return html`
    ${eventFormStyles}
    <h2>Jakým způsobem se do programu zapojíš?</h2>
    <section class="event-type">
      <div class="hc-card hc-card--decorated">
        <h3>Talk / Přednáška / Diskuse</h3>
        <div>
          <p>Byznys. Life. NGOs. BioHacks. Byznys stories</p>
          <a
            class="hc-link--decorated"
            href="#"
            @click=${(e) => {
    e.preventDefault();
    showLineupEventForm("limain");
  }}
            >Mainframe</a
          >
        </div>
        <div>
          <p>Data. Dev. Hacks.</p>
          <a
            class="hc-link--decorated"
            href="#"
            @click=${(e) => {
    e.preventDefault();
    showLineupEventForm("libase");
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
          @click=${(e) => {
    e.preventDefault();
    showLineupEventForm("liback");
  }}
          >Backend</a
        >
      </div>
      <div class="hc-card hc-card--decorated">
        <h3>Sport / Meditace</h3>
        <a
          class="hc-link--decorated"
          href="#"
          @click=${(e) => {
    e.preventDefault();
    showLineupEventForm("lipeep");
  }}
          >PeopleWare</a
        >
      </div>
      <div class="hc-card hc-card--decorated">
        <h3>Hudební program</h3>
        <a
          class="hc-link--decorated"
          href="#"
          @click=${(e) => {
    e.preventDefault();
    showLineupEventForm("liwood");
  }}
          >WoodStack /<br />Jungle release</a
        >
      </div>
      <div class="hc-card hc-card--decorated">
        <h3>Další / jiný doprovodný program</h3>
        <a
          class="hc-link--decorated"
          href="#"
          @click=${(e) => {
    e.preventDefault();
    showLineupEventForm("liother");
  }}
          >Doprovodný program</a
        >
      </div>
    </section>
  `;
}

export function eventFormTemplate(
  {
    lineupId,
    profile,
    year,
    apiHost,
    header,
    campStartAt,
    campEndAt,
    preferredTime,
    hackers = [],
    events = [],
    selectedTopic,
    editingEvent,
    onEventSubmit = () => {}
  }
) {
  const headHtml = header ?? lineupHeadersTemplates.get(lineupId);
  const fieldsHtml = lineupsFieldsTemplates.get(lineupId)({
    campStartAt,
    campEndAt,
    preferredTime,
    lineupTopicEvents: events.filter(({ lineup, type }) => lineup === lineupId && type === "topic"),
    selectedTopic,
    editingEvent
  });

  return html`
    ${eventFormStyles} ${headHtml}
    <form method="post" action="${apiHost}program" @submit=${onEventSubmit}>
      <input type="hidden" name="lineup" value=${lineupId} />
      ${when(editingEvent, () => html`<input type="hidden" name="_id" value=${editingEvent._id} />`)}
      <input
        type="hidden"
        name="slackID"
        .value=${editingEvent?.slackID ?? profile.sub}
      />
      <input type="hidden" name="year" value=${year} />
      <input type="hidden" name="timezone" value="+02:00" />
      ${fieldsHtml}
    </form>
  `;
}

export async function renderEventForm(rootElement, {
  year,
  apiHost,
  profile,
  lineupId,
  header,
  campStartAt,
  campEndAt,
  preferredTime,
  hijackHacker = false, // mby change to hackers[] that are passed
  events = [],
  selectedTopic,
  editingEvent,
  onEventSubmit
}) {
  initRenderLoop(state, rootElement);
  const view = lineupId ? eventFormTemplate : signpostTemplate;

  transact((x) =>
    Object.assign(x, {
      header,
      view,
      apiHost,
      profile,
      lineupId,
      campStartAt,
      campEndAt,
      preferredTime,
      events,
      selectedTopic,
      editingEvent,
      onEventSubmit
    })
  );

  if (hijackHacker) {
    try {
      const params = new URLSearchParams({ year });
      const response = await withAuthHandler(
        // TODO: read it from attendees instead
        fetch(new URL(`housing?${params}`, apiHost).href, {
          headers: { Accept: "application/json" },
          credentials: "include"
        }),
        {
          onUnauthenticated() {
            setReturnUrl(location.href);
            return new Promise((resolve, reject) => {
              signOut((path) => new URL(path, apiHost).href);
              reject({ unauthenticated: true });
            });
          }
        }
      );
      const housing = await response.json();
      const hackers = housing.map(({ name, slackID }) => ({ name, slackID }));
      swapIn("hackers", () => hackers);
    } catch (o_O) {
      rollbar.error(o_O);
      snackbar.labelText = "Chyba při načítání hackerů";
      snackbar.show();
    }
  }
}
