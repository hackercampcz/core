import { initRenderLoop } from "./lib/renderer.js";
import { html } from "lit-html";
import { defAtom } from "@thi.ng/atom";
import { classMap } from "lit-html/directives/class-map.js";
import * as rollbar from "./lib/rollbar.js";

const state = defAtom({
  view: renderProgram,
  startAt: new Date(`2020-09-01T14:00:00`),
  endAt: new Date(`2020-09-04T14:00:00`),
  lineups: [
    { name: "Mainframe", desc: "Lorem ipsum do ro faso lobortis ipsum" },
    {
      name: "Basecamp",
      desc: "Donec euismod nisi eu, consectetur, lobortis ipsum.",
    },
    {
      name: "Backend",
      desc: "Consectetur adipiscing elit. Donec euismodnisi eu, consectetur, lobortis ipsum.",
    },
    {
      name: "Peopleware",
      desc: "Lorum ipsum dolor sit amet, consectetur adipiscing elit.",
    },
    {
      name: "WoodStack",
      desc: "Donec euismod nisi eu, consectetur, lobortis ipsum.",
    },
    {
      name: "Doprovodný program",
      desc: "Donec euismod nisi eu, consectetur, lobortis ipsum.",
    },
  ],
  events: [
    {
      id: "ev1",
      lineup: "Mainframe",
      startAt: new Date(`2020-09-01T14:00:00`),
      endAt: new Date(`2020-09-01T14:45:00`),
      title: "Zahájení campu",
    },
    {
      id: "ev3",
      lineup: "Peopleware",
      startAt: new Date(`2020-09-01T16:30:00`),
      endAt: new Date(`2020-09-01T17:45:00`),
      title: "Hra: Nahoněnou",
    },
  ],
});
const transact = (fn) => state.swap(fn);

function makeTimeline(startAt, endAt, minutes = 15) {
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

function getSlotNumber(time, minutes = 15) {}

function makeTick(time) {
  // return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (time.getMinutes() === 0) {
    // return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${time.getHours()}h`;
  } else {
    return `${time.getMinutes()}m`;
  }
}

/**
 *
 * @param {defAtom} state
 */
function renderProgram({ lineups, startAt, endAt, events }) {
  // get css var from dom js
  // getComputedStyle(element).getPropertyValue('--color-font-general');

  const lineUpEvents = (lineup, events) =>
    events.filter((event) => event.lineup === lineup.name);

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
      .program__header {
        box-sizing: border-box;
        padding: var(--padding);
      }
      .program__content {
        max-width: 100vw;
        overflow-x: auto;
        padding: var(--padding) 0;
      }
      @media (min-width: 600px) {
        .program {
          --head-width: calc(100vw / 3);
          --slot-width: calc(100vw / 6 / 4);
        }
      }

      /**
       * Horizontal lines of stable program
       */
      .lineup {
        display: flex;
      }
      .lineup__header {
        min-width: var(--head-width);
        background-color: var(--hc-background-color);
        box-sizing: border-box;
        padding: calc(var(--padding));
        border-top: 1px solid var(--tick-color);
        border-right: 1px solid var(--tick-highlight-color);
      }
      .lineup__content {
        display: flex;
        align-items: center;
        position: relative;
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
      /* first and every odd */
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
      .lineup:last-child .lineup__header,
      .lineup:last-child .lineup__slot {
        border-bottom: 1px solid var(--tick-color);
      }
      .lineup__event {
        position: absolute;
        z-index: 1;
        background-color: var(--hc-background-color);
        padding: calc(var(--padding) / 2);
        border-radius: 4px;
        cursor: pointer;
        overflow: hidden;
        border: 1px solid var(--tick-highlight-color);
        width: calc(var(--slot-width) * attr(data-slots));
        transition: all 0.2s ease-in-out;
      }
      .lineup__event:hover {
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
      <div class="program__content">
        ${lineups.map(
          (lineup) => html`
            <div class="lineup">
              <div class="lineup__header">
                <h2>${lineup.name}</h2>
                <p>${lineup.desc}</p>
                ${lineUpEvents(lineup, events).map(
                  (event) =>
                    html`
                      <div class="lineup__event" data-slots=${6}>
                        ${event.title}
                      </div>
                    `
                )}
              </div>
              <div class="lineup__content">
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

export async function main({ rootElement, env }) {
  rollbar.init(env);
  initRenderLoop(state, rootElement);

  const dateFrom = new Date("2022-09-01T14:00");
  const dateTo = new Date("2022-09-04T14:00");
  const ticks = (dateTo - dateFrom) / 1000 / 60 / 15;
  transact((x) => Object.assign(x, { slots: Array.from({ length: ticks }) }));
}
