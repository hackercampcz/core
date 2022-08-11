import { initRenderLoop } from "./lib/renderer.js";
import { html } from "lit-html";
import { defAtom } from "@thi.ng/atom";
import { classMap } from "lit-html/directives/class-map.js";
import * as rollbar from "./lib/rollbar.js";
import { objectWalk } from "./lib/object.js";
import structuredClone from "@ungap/structured-clone";
import { ref } from "lit/directives/ref.js";
import { debounce } from "./lib/function.js";

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

function showModalDialog(id) {
  const element = document.getElementById(id);
  element.showModal();
  element.querySelector("button[name=close]").addEventListener("click", () => {
    element.close();
  });
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

  transact((x) =>
    Object.assign(x, {
      visibleDate,
    })
  );
}

function handleBodyScroll(event) {
 console.log(event)
}

/**
 *
 * @param {defAtom} state
 */
function renderProgram({
  lineups,
  startAt,
  endAt,
  events,
  visibleDate,
  onLineupsScroll,
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
        --head-width: calc(100vw * 2 / 3);
        --slot-width: calc(100vw / 2.5 / 4);
        --tick-color: #eee;
        --tick-highlight-color: #aaa;
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
        position: relative;
      }
      @media (min-width: 600px) {
        .program {
          --head-width: calc(100vw / 3);
          --slot-width: calc(100vw / 6 / 3);
        }
      }
      @media (min-width: 900px) {
        .program {
          --head-width: calc(100vw / 4);
          --slot-width: calc(100vw / 6 / 4);
        }
      }
      @media (min-width: 1600px) {
        .program {
          --head-width: calc(100vw / 6);
          --slot-width: calc(100vw / 6 / 6);
        }
      }

      /**
       * Horizontal sticky pagination by days
       */
      .program__dayline {
        position: relative;
        padding-top: var(--spacing);
      }
      .dayline {
        padding: var(--spacing);
        padding-bottom: calc(var(--spacing) / 2);
        display: flex;
        align-items: center;
        justify-content: center;
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
        position: relative;
      }
      .lineup__info {
        min-width: var(--head-width);
        background-color: var(--hc-background-color);
        box-sizing: border-box;
        padding: calc(var(--spacing) / 2);
        border-top: 1px solid var(--tick-color);
        border-right: 1px solid var(--tick-highlight-color);
      }
      @media (min-width: 600px) {
        padding: calc(var(--spacing) * 1.5);
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
        top: calc(var(--slot-width) / 2 - var(--spacing) / 2);
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
        font-size: 12px;
      }
      .lineup__event pre,
      .lineup__event + dialog pre {
        line-break: auto;
        word-break: break-word;
        white-space: break-spaces;
        margin: 0;
        line-height: 1.2;
      }
      .lineup__event pre.highlight {
        font-weight: bold;
        font-size: 120%;
      }
      @media (min-width: 400px) {
        .lineup__event {
          font-size: 14px;
        }
      }
      @media (min-width: 800px) {
        .lineup__event {
          font-size: 16px;
        }
      }
      @media (min-width: 1600px) {
        .lineup__event {
          font-size: 18px;
        }
      }
      .lineup__event:hover,
      .lineup__event:active {
        width: max-content;
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

      .timeline_tick {
        position: absolute;
        top: 0;
      }
    </style>
    <div class="program">
      <div class="program__header">
        <h1>Program</h1>
        <p>
          Lorum ipsum dolor sit amet, consectetur adipiscing elit. Donec euismod
          nisi eu, consectetur, lobortis ipsum.
        </p>
        <!-- <button
          class="hc-link hc-link--decorated"
          style="
            margin: var(--spacing) auto;
            display: block;
            font-size: 120%;
          "
        >
          Přidat vlastní program
        </button> -->
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
                @click=${() => {
                  showModalDialog(`lineup-detail-${lineup.id}`);
                }}
              >
                <h2>${lineup.name}</h2>
                <p>${lineup.description}</p>
              </div>
              <dialog class="lineup__detail" id="lineup-detail-${lineup.id}">
                <h1>${lineup.name}</h1>
                <p>${lineup.description}</p>
                <p>Tady by toho mělo bejt víc.</p>
                <button name="close">Zavřít</button>
              </dialog>
              <div class="lineup__eventsline">
                ${lineUpEvents(lineup, events).map(
                  (event) =>
                    html`
                      <div
                        class="lineup__event"
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
                      </div>
                      <dialog id="event-detail-${event.id}">
                        <h1>${event.title}</h1>
                        <p>
                          ${formatEventTimeInfo(event)}
                          <code>${lineup.name}</code><br>
                        </p>
                        <pre>${event.description}</pre>
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
                          console.log("add event?", time);
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
    </div>
  `;
}

async function fetchLineups(apiHost) {
  // TODO: use API to get events 👇
  // const response = await fetch(new URL(`program/?year=2022`, apiHost).href, {
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
    console.error(o_O);
    alert("Chyba při načítání lineupů\n" + o_O);
  }

  try {
    const events = await fetchEvents(env["api-host"]);
    transact((x) => Object.assign(x, { events: instatializeDates(events) }));
  } catch (o_O) {
    console.error(o_O);
    alert("Chyba při načítání eventů\n" + o_O);
  }

  transact((x) =>
    Object.assign(x, {
      onLineupsScroll: debounce(handleLineupsScroll),
    })
  );

  document.body.addEventListener("scroll", debounce(handleBodyScroll));

  requestAnimationFrame(() => {
    const param = location.hash.replace(/^#/, "");

    if (isISODateTime(param)) {
      console.log(param);
      scrollToDate(new Date(param));
    } else {
      scrollToDate(new Date());
    }
  });
}
