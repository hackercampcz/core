import { initRenderLoop } from "./lib/renderer.js";
import { html } from "lit-html";
import { defAtom } from "@thi.ng/atom";
import { classMap } from "lit-html/directives/class-map.js";
import * as rollbar from "./lib/rollbar.js";
import { objectWalk } from "./lib/object.js";

const SLOT_MINUTES = 15;

const state = defAtom({
  view: renderProgram,
  startAt: new Date(`2020-09-01T14:00:00`),
  endAt: new Date(`2020-09-04T14:00:00`),
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
function getSlotNumber(startAt, time, minutes = SLOT_MINUTES) {
  const diff = time.getTime() - startAt.getTime();
  const perMinutes = minutes * 60 * 1000;
  const steps = diff / perMinutes;
  return steps;
}

/**
 *
 * @param {defAtom} state
 */
function renderProgram({ lineups, startAt, endAt, events }) {
  const lineUpEvents = (lineup, events) =>
    events.filter((event) => event.lineup === lineup.name);

  const eventStartAtSlot = (event) => getSlotNumber(startAt, event.startAt);
  const eventDurationInSlots = (event) =>
    getSlotNumber(startAt, event.endAt) - getSlotNumber(startAt, event.startAt);

  return html`
    <style>
      /**
       * top level container
       */
      .program {
        --padding: var(--mdc-layout-grid-margin-desktop, 24px);
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
      /* media min */
      .program__header {
        box-sizing: border-box;
        padding: var(--padding);
      }
      .program__content {
        max-width: 100vw;
        overflow-x: auto;
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
        padding: calc(var(--padding) / 2);
        border-top: 1px solid var(--tick-color);
        border-right: 1px solid var(--tick-highlight-color);
      }
      @media (min-width: 600px) {
        padding: calc(var(--padding) * 1.5);
      }
      .lineup__timeline {
        display: flex;
        align-items: center;
        padding-right: var(--slot-width);
      }
      .lineup__slot {
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
        padding: var(--padding) 0;
      }
      .lineup__event {
        position: absolute;
        z-index: 1;
        background-color: var(--hc-background-color);
        box-sizing: border-box;
        padding: calc(var(--padding) / 4);
        border-radius: 4px;
        cursor: pointer;
        overflow: hidden;
        border: 1px solid var(--tick-highlight-color);
        transition: all 0.2s ease-in-out;
        font-size: 12px;
      }
      .lineup__event pre {
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
          font-size: 12px;
        }
      }
      @media (min-width: 800px) {
        .lineup__event {
          font-size: 14px;
        }
      }
      @media (min-width: 1600px) {
        .lineup__event {
          font-size: 15px;
        }
      }
      .lineup__event:hover,
      .lineup__event:active {
        width: max-content;
      }
    </style>
    <div class="program">
      <div class="program__header">
        <h1>Program</h1>
        <p>
          Lorum ipsum dolor sit amet, consectetur adipiscing elit. Donec euismod
          nisi eu, consectetur, lobortis ipsum.
        </p>
      </div>
      <div class="program__content" id="lineups">
        ${lineups.map(
          (lineup) => html`
            <div class="lineup">
              <div class="lineup__info">
                <h2>${lineup.name}</h2>
                <p>${lineup.desc}</p>
              </div>
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
                      >
                        <pre
                          style=${`font-weight: ${
                            event.level > 100 ? "bold" : "normal"
                          }; font-size: ${event.level || 100}%`}
                        >
${event.title}</pre
                        >
                      </div>
                    `
                )}
              </div>
              <div class="lineup__timeline">
                ${makeTimeline(startAt, endAt, 15).map(
                  (time) =>
                    html`
                      <div class="lineup__slot" data-tick=${makeTick(time)}>
                        &nbsp;
                      </div>
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

const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

function isISODateTime(date) {
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
  transact((x) => Object.assign(x, { slots: Array.from({ length: ticks }) }));

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
}
