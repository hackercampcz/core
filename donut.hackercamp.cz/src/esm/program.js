import { initRenderLoop } from "./lib/renderer.js";
import { html } from "lit-html";
import { defAtom } from "@thi.ng/atom";
import { classMap } from "lit-html/directives/class-map.js";
import * as rollbar from "./lib/rollbar.js";
import { objectWalk } from "./lib/object.js";
import structuredClone from "@ungap/structured-clone";
import { when } from "lit/directives/when.js";
import { throttle } from "./lib/function.js";
import { showModalDialog } from "./modal-dialog.js";
import { init as renderAddEventDialog } from "./add-event.js";
import { getSlackProfile } from "./lib/profile.js";

const SLOT_MINUTES = 15;
const DAY_START_HOUR = 8;

const state = defAtom({
  view: renderProgram,
  startAt: new Date(`2022-09-01T14:00:00`),
  visibleDate: new Date(`2022-09-01T14:00:00`),
  onLineupsScroll: () => {},
  endAt: new Date(`2022-09-04T14:00:00`),
  lineups: [],
  events: [],
  profile: {},
});
const transact = (fn) => state.swap(fn);

function makeTimeline(startAt, endAt, minutes = SLOT_MINUTES) {
  const times = [];
  const diff = endAt.getTime() - startAt.getTime();
  const perMinutes = minutes * 60 * 1000;
  const steps = Math.floor(diff / perMinutes);
  for (let i = 0; i < steps; i++) {
    const time = new Date(startAt.getTime() + perMinutes * i);
    times.push(time);
  }
  return times;
}

function makeTick(time) {
  if (time.getMinutes() === 0) {
    return `${time.getHours()}h`;
  } else {
    return `${time.getMinutes()}m`;
  }
}

function makeDayline(startAt, endAt, minutes = SLOT_MINUTES) {
  const dayStart = new Date(
    startAt.getFullYear(),
    startAt.getMonth(),
    startAt.getDate(),
    DAY_START_HOUR
  );
  const dayEnd = new Date(
    endAt.getFullYear(),
    endAt.getMonth(),
    endAt.getDate() + 1,
    DAY_START_HOUR
  );
  const days = makeTimeline(dayStart, dayEnd, 24 * 60);
  return days;
}

function getSlotNumber(startAt, time, minutes = SLOT_MINUTES) {
  const diff = time.getTime() - startAt.getTime();
  const perMinutes = minutes * 60 * 1000;
  const steps = diff / perMinutes;
  return steps;
}

function formatEventTimeInfo(event) {
  return html`Začíná v
    <strong
      >${event.startAt.toLocaleDateString([], {
        weekday: "long",
      })}
      ${event.startAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}</strong
    >
    a končí v
    <strong
      >${event.endAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}</strong
    >.`;
}

function getSlotWidth() {
  const scrollElement = document.getElementById("lineups");
  return scrollElement.querySelector(".lineup__slot").offsetWidth;
}

function scrollToDate(date) {
  const { startAt } = state.deref();
  const scrollElement = document.getElementById("lineups");
  const time = (date - startAt) / 1000 / 60 / SLOT_MINUTES;
  const left = time * getSlotWidth();
  scrollElement.scrollLeft = left;
}

function handleLineupsScroll(event) {
  const { startAt } = state.deref();
  const visibleDate = new Date(startAt.getTime());
  const minutesScrolledOut =
    (event.target.scrollLeft / getSlotWidth()) * SLOT_MINUTES;

  visibleDate.setMinutes(startAt.getMinutes() + minutesScrolledOut);
  location.hash = `#${visibleDate.toISOString()}`;

  transact((x) =>
    Object.assign(x, {
      visibleDate,
    })
  );
}

function handleBodyScroll(event) {
  const lineupsElement = document.querySelector("#lineups");
  const daylineElement = document.querySelector(".dayline");
  if (!daylineElement) {
    return;
  }
  const { y } = lineupsElement.getBoundingClientRect();
  const { height } = daylineElement.getBoundingClientRect();
  daylineElement.parentElement.style.height = `${height}px`;
  if (document.body.scrollTop + height > y) {
    daylineElement.style.position = "fixed";
  } else {
    daylineElement.style.position = "initial";
  }
}

/**
 * TODO: split me?
 * @param {defAtom} state
 */
function renderProgram({
  lineups,
  startAt,
  endAt,
  events,
  visibleDate,
  onLineupsScroll,
  apiUrl,
  profile,
}) {
  const lineUpEvents = (lineup, events) =>
    events.filter((event) => event.lineup === lineup.id);

  const eventStartAtSlot = (event) => getSlotNumber(startAt, event.startAt);
  const eventDurationInSlots = (event) =>
    getSlotNumber(startAt, event.endAt) - getSlotNumber(startAt, event.startAt);

  return html`
    <style>
      body {
        overflow-anchor: none;
      }
      /**
       * top level container
       */
      .program {
        --spacing: var(--mdc-layout-grid-margin-desktop, 24px);
        --info-width: calc(100vw * 2 / 3);
        --slot-width: calc(100vw / 2.5 / 4);
        --tick-color: #eee;
        --tick-highlight-color: #aaa;
        --dialog-width: 800px;
      }
      @media (prefers-color-scheme: dark) {
        .program {
          --tick-color: #666;
          --tick-highlight-color: #888;
        }
      }
      .program__header {
        box-sizing: border-box;
        padding: var(--spacing);
        margin-bottom: var(--spacing);
      }
      .program__lineups {
        max-width: 100vw;
        overflow-x: auto;
        scroll-behavior: smooth;
      }
      @media (min-width: 600px) {
        .program {
          --info-width: calc(100vw / 3);
          --slot-width: calc(100vw / 6 / 3);
        }
      }
      @media (min-width: 900px) {
        .program {
          --info-width: calc(100vw / 4);
          --slot-width: calc(100vw / 6 / 4);
        }
      }
      @media (min-width: 1600px) {
        .program {
          --info-width: calc(100vw / 5);
          --slot-width: calc(100vw / 6 / 6);
        }
      }

      /**
       * Horizontal sticky pagination by days
       */
      .program__dayline {
        position: relative;
      }
      .dayline {
        padding: calc(var(--spacing) / 2);
        display: flex;
        align-items: center;
        justify-content: center;

        top: 0;
        left: 0;
        right: 0;
        background-color: var(--hc-background-color);
        background-image: var(--hc-background-image, none);
        z-index: 4;
        border-bottom: 1px solid var(--tick-color);
      }
      a.dayline__tick {
        flex: 1;
        text-decoration: none;
        color: var(--hc-text-color);
        text-align: center;
      }
      a.dayline__tick:hover {
        text-decoration: underline;
      }
      a.dayline__tick.--visible {
        font-weight: bold;
        font-size: 120%;
      }

      /**
       * Horizontal lines of stable program
       */
      .lineup {
        display: flex;
      }
      .lineup__info {
        min-width: var(--info-width);
        background-color: var(--hc-background-color);
        box-sizing: border-box;
        padding: calc(var(--spacing) / 2);
        border-top: 1px solid var(--tick-color);
        border-right: 1px solid var(--tick-highlight-color);
        z-index: 3;
        display: flex;
        flex-direction: column;
        cursor: pointer;
      }
      @media (min-width: 1200px) {
        .lineup__info {
          padding: calc(var(--spacing));
        }
      }
      .lineup__sticky {
        position: absolute;
        margin: calc(var(--spacing) / 2);
        z-index: 2;
        font-size: 12px;
        left: 0;
        text-decoration: none;
        background: var(--hc-background-image);
        padding: 8px;
      }
      .lineup__timeline {
        display: flex;
        align-items: center;
        padding-right: var(--slot-width);
      }
      .lineup__slot {
        display: block;
        text-decoration: none;
        width: var(--slot-width);
        height: 100%;
        box-sizing: border-box;
        border-top: 1px solid var(--tick-color);
        border-right: 1px solid var(--tick-color);
        position: relative;
      }
      .lineup__slot:nth-child(4n) {
        border-right: 1px solid var(--tick-highlight-color);
      }
      .lineup:nth-child(2n) .lineup__slot:before {
        content: attr(data-day);
        display: block;
        position: absolute;
        width: 100%;
        text-align: center;
        line-height: 1.4;
        top: 0;
        font-size: 12px;
        color: var(--tick-color);
      }
      .lineup__slot[data-tick$="h"]:after {
        color: var(--tick-highlight-color) !important;
      }
      .lineup:nth-child(2n + 1) .lineup__slot:after {
        content: attr(data-tick);
        display: block;
        position: absolute;
        width: 100%;
        text-align: center;
        line-height: 1.4;
        bottom: 0;
        font-size: 12px;
        color: var(--tick-color);
      }
      .lineup__slot[data-tick$="h"]:after {
        color: var(--tick-highlight-color) !important;
      }
      .lineup:last-child .lineup__info,
      .lineup:last-child .lineup__slot {
        border-bottom: 1px solid var(--tick-color);
      }
      .lineup__eventsline {
        position: relative;
        width: 0;
        padding: var(--spacing) 0;
      }
      .lineup__event {
        position: absolute;
        z-index: 1;
        background-color: var(--hc-background-color);
        box-sizing: border-box;
        padding: calc(var(--spacing) / 4);
        border-radius: 4px;
        cursor: pointer;
        overflow: hidden;
        border: 1px solid var(--tick-highlight-color);
        transition: all 0.2s ease-in-out;
        font-size: 14px;
      }
      .lineup__event pre,
      .lineup__event + dialog pre,
      .lineup__info pre {
        line-break: auto;
        word-break: break-word;
        white-space: break-spaces;
        margin: 0;
        line-height: 1.2;
      }
      .lineup__info pre {
        line-height: 1.5;
      }
      .lineup__event pre.highlight {
        font-weight: bold;
        font-size: 120%;
      }
      @media (min-width: 400px) {
        .lineup__event,
        .lineup__info {
          font-size: 14px;
        }
      }
      @media (min-width: 800px) {
        .lineup__event,
        .lineup__info {
          font-size: 16px;
        }
      }
      @media (min-width: 1600px) {
        .lineup__event,
        .lineup__info {
          font-size: 18px;
        }
      }
      .lineup__event:hover,
      .lineup__event:active {
        width: max-content;
      }

      :where(.lineup__detail, .event__detail) h1 {
        margin: calc(var(--spacing) / 2) 0 var(--spacing) 0;
        font-size: 2rem;
        line-height: 1.2;
      }

      dialog {
        width: var(--dialog-width);
      }

      dialog button[name="close"] {
        display: block;
        margin: var(--spacing) auto 0 auto;
        background-color: var(--hc-background-color);
        color: var(--hc-text-color);
        border: 1px solid var(--hc-text-color);
        border-radius: 2px;
        padding: calc(var(--spacing) / 2);
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
      }

      .program__beside {
        box-size: border-box;
        padding: calc(var(--spacing));
      }

      ul {
        margin: var(--spacing) 0;
        padding: 0;
      }

      .lineup:first-child {
        font-style: italic;
      }
      .lineup:first-child .lineup__event {
        border: 1px solid var(--tick-color);
        background-color: var(--hc-background-color);
        background-image: var(--hc-background-image, none);
      }
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
    <div class="program">
      <div class="program__header">
        <h1>Program</h1>
        <p>
          Hacker Camp bude jen takový, jaký si ho uděláme. Tady najdeš program a
          aktivity, co už táborníci zapsali. Další aktivty přibývají a některé
          mohou hackeři jen nahlásit na začátku každého bloku před Mainframe.
          Zkrátka: Porgram se může a bude měnit za chodu :) Takže se těš a
          sleduj co se děje online i offline.
        </p>
        <a
          class="hc-link hc-link--decorated"
          style="font-size: 120%;"
          @click=${(event) => {
            event.preventDefault();
            renderAddEventDialog(document.getElementById("add-event"), {
              apiUrl,
              profile,
            });
            showModalDialog("add-event");
          }}
        >
          Zapoj se do programu
        </a>
      </div>
      <div class="program__dayline">
        <div class="dayline">
          ${makeDayline(startAt, endAt).map(
            (day) =>
              html`
                <a
                  class=${classMap({
                    dayline__tick: true,
                    "--visible": visibleDate.getDate() === day.getDate(),
                  })}
                  href="#${day.toISOString()}"
                  @click=${(event) => {
                    const date = new Date(day);
                    date.setHours(DAY_START_HOUR);
                    scrollToDate(date);
                  }}
                >
                  ${day.toLocaleDateString([], { weekday: "long" })}
                </a>
              `
          )}
        </div>
      </div>
      <div class="program__lineups" id="lineups" @scroll=${onLineupsScroll}>
        ${lineups.map(
          (lineup) => html`
            <div class="lineup">
              <div
                class="lineup__info"
                data-name=${lineup.name}
                @click=${() => {
                  showModalDialog(`lineup-detail-${lineup.id}`);
                }}
              >
                <h2>${lineup.name}</h2>
                <pre>${lineup.description}</pre>
              </div>
              <a
                class="lineup__sticky"
                @click=${(event) => {
                  event.preventDefault();
                  showModalDialog(`lineup-detail-${lineup.id}`);
                }}
                >${lineup.name}</a
              >
              <dialog class="lineup__detail" id="lineup-detail-${lineup.id}">
                <h1>${lineup.name}</h1>
                <p>${lineup.description}</p>
                <p>${lineup.detail}</p>
                ${when(
                  lineup.id !== "liorg",
                  () => html`<a
                    class="hc-link hc-link--decorated"
                    style="padding: calc(var(--spacing) / 4);"
                    @click=${() => {
                      renderAddEventDialog(
                        document.getElementById("add-event"),
                        {
                          apiUrl,
                          profile,
                          lineupId: lineup.id,
                        }
                      );
                      showModalDialog("add-event");
                    }}
                  >
                    Zapoj se do programu
                  </a> `
                )}
                <hr />
                <button name="close">Zavřít</button>
              </dialog>
              <div class="lineup__eventsline">
                ${lineUpEvents(lineup, events).map(
                  (event) =>
                    html`
                      <div
                        class="lineup__event"
                        data-lineup=${lineup.id}
                        id=${event.id}
                        style=${`
                          left: calc(${eventStartAtSlot(
                            event
                          )} * var(--slot-width) + 4px);
                          width: calc(${eventDurationInSlots(
                            event
                          )} * var(--slot-width) - 8px);
                          top: ${event._top};
                        `}
                        @click=${() => {
                          showModalDialog(`event-detail-${event.id}`);
                        }}
                      >
                        <pre
                          style=${`font-weight: ${
                            event.level > 100 ? "bold" : "normal"
                          }; font-size: ${event.level || 100}%;`}
                        // eslint-disable-next-line prettier/prettier
                        >${event.title}</pre>
                        <div style="display: flex;">
                          ${when(
                            event.type === "topic",
                            () => html`
                              ${when(
                                event.description,
                                () => html`<pre
                                  style="font-size: small; margin-bottom: calc(var(--spacing) / 4);"
                                >
${event.description}</pre
                                >`
                              )}
                              <div
                                style="text-align: center; flex: 1; align-self: flex-end; margin: calc(var(--spacing) / 4);"
                              >
                                <a
                                  class="hc-link hc-link--decorated"
                                  style="font-size: small; padding: calc(var(--spacing) / 4);"
                                  @click=${(event) => {
                                    event.preventDefault();
                                    renderAddEventDialog(
                                      document.getElementById("add-event"),
                                      { apiUrl, profile }
                                    );
                                    showModalDialog("add-event");
                                  }}
                                >
                                  Zapojit se
                                </a>
                              </div>
                            `
                          )}
                        </div>
                      </div>
                      <dialog class="event__detail" id="event-detail-${
                        event.id
                      }">
                        <h1>${event.title}</h1>
                        <p>
                          ${formatEventTimeInfo(event)}
                          <code>${lineup.name}</code><br>
                        </p>
                        <pre>${event.description}</pre>
                        ${when(
                          event.type === "topic",
                          () => html`
                            <p>
                              <a
                                class="hc-link hc-link--decorated"
                                style="padding: calc(var(--spacing) / 4);"
                                @click=${(event) => {
                                  event.preventDefault();
                                  renderAddEventDialog(
                                    document.getElementById("add-event"),
                                    { apiUrl, profile }
                                  );
                                  showModalDialog("add-event");
                                }}
                              >
                                Zapojit se
                              </a>
                              <hr />
                            </p>
                          `
                        )}
                        <button name="close">Zavřít</button>
                      </dialog>
                    `
                )}
              </div>
              <div class="lineup__timeline">
                ${makeTimeline(startAt, endAt, 15).map(
                  (time) =>
                    html`
                      <a
                        class="lineup__slot"
                        ${/*href="#${lineup.id}-${time.toISOString()}"*/ ""}
                        data-tick=${makeTick(time)}
                        data-day=${time.toLocaleDateString([], {
                          weekday: "short",
                        })}
                        @click=${(event) => {
                          renderAddEventDialog(
                            document.getElementById("add-event", {
                              apiUrl,
                              profile,
                            })
                          );
                          showModalDialog("add-event");
                        }}
                      >
                        &nbsp;
                      </a>
                    `
                )}
              </div>
            </div>
          `
        )}
      </div>
      <div class="program__beside">
        <h2>Další program</h2>
        <p>
          Nejen přednáškami, workshopy, hudbou a sportem živ je hacker. Na campu
          se toho děje mnohem víc. Můžeš si vyzkoušet zajímavé hry -> živé,
          deskovky, karty, playstationy. Pár z vás nabízí one-one povídání,
          kvízi, sekání dřeva a spoustu dalšího. Tady najdete vše pohromadě.
        </p>
        <ul>
          <li>Pepa Pekař pořádá: Sochej z chlepa.</li>
          <li>Pepa Pekař pořádá: Sochej z chlepa.</li>
          <li>Pepa Pekař pořádá: Sochej z chlepa.</li>
        </ul>
        <a
          class="hc-link hc-link--decorated"
          style="padding: calc(var(--spacing) / 4)"
          @click=${() => {
            showModalDialog("add-event");
          }}
        >
          Zapoj se do programu
        </a>
      </div>
      <dialog id="add-event"></dialog>
    </div>
  `;
}

async function fetchLineups(apiHost) {
  const response = await fetch("/program/lineups.json?year=2022", {
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  const data = await response.json();
  return data;
}

async function fetchEvents(apiHost) {
  // TODO: use API to get events 👇
  // const response = await fetch(new URL(`program/?year=2022`, apiHost).href, {
  const response = await fetch("/program/events.json?year=2022", {
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  const data = await response.json();
  return data;
}

function isISODateTime(date) {
  const isoDateTimeRegex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{3})?Z?$/;
  return typeof date === "string" && isoDateTimeRegex.test(date);
}

function instatializeDates(input) {
  const output = structuredClone(input);
  objectWalk(output, (value, key, obj) => {
    if (isISODateTime(value)) {
      obj[key] = new Date(value);
    }
  });
  return output;
}

export async function main({ rootElement, env }) {
  rollbar.init(env);
  initRenderLoop(state, rootElement);

  transact((x) =>
    Object.assign(x, { apiUrl: env["api-host"], profile: getSlackProfile() })
  );

  const { startAt, endAt } = state.deref();
  const ticks = (endAt - startAt) / 1000 / 60 / 15;
  transact((x) =>
    Object.assign(x, {
      slots: Array.from({ length: ticks }),
    })
  );

  try {
    const lineups = await fetchLineups(env["api-host"]);
    transact((x) => Object.assign(x, { lineups: instatializeDates(lineups) }));
  } catch (o_O) {
    rollbar.error(o_O);
    alert("Chyba při načítání lineupů\n" + o_O);
  }

  try {
    const events = await fetchEvents(env["api-host"]);
    transact((x) => Object.assign(x, { events: instatializeDates(events) }));
  } catch (o_O) {
    rollbar.error(o_O);
    alert("Chyba při načítání eventů\n" + o_O);
  }

  // Manual and auto scroll trought the program features

  transact((x) =>
    Object.assign(x, {
      onLineupsScroll: throttle(handleLineupsScroll),
    })
  );

  document.addEventListener("scroll", throttle(handleBodyScroll));

  requestAnimationFrame(() => {
    const param = location.hash.replace(/^#/, "");

    if (isISODateTime(param)) {
      scrollToDate(new Date(param));
    } else {
      scrollToDate(new Date());
    }
  });
}
