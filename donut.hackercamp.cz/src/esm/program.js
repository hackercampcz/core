import { initRenderLoop } from "./lib/renderer.js";
import { html } from "lit-html";
import { defAtom } from "@thi.ng/atom";
import * as rollbar from "./lib/rollbar.js";

const state = defAtom({
  view: renderProgram,
  fromTime: new Date(`2020-09-01T14:00:00`),
  toTime: new Date(`2020-09-04T14:00:00`),
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
    // TBD
  ],
});
const transact = (fn) => state.swap(fn);

function makeTimeline(from, to) {
  const times = [];
  const fromTime = new Date(from);
  const toTime = new Date(to);
  const diff = toTime.getTime() - fromTime.getTime();
  const perMinutes = 15 * 60 * 1000;
  const steps = Math.floor(diff / perMinutes);
  for (let i = 0; i < steps; i++) {
    const time = new Date(fromTime.getTime() + perMinutes * i);
    times.push(time);
  }
  return times;
}

function makeTick(time) {
  if (time.getMinutes() === 0) {
    return html`
      <span>
        ${time.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    `;
  }
}

function renderEvent(time) {
  if (Math.random() > 0.1) return;
  return html`<div class="event">&nbsp;</div> `;
}

function renderAddButton(time) {
  return html`
    <div class="add-event">
      <button class="hc-button">+</button>
    </div>
  `;
}

/**
 *
 * @param {defAtom} state
 */
function renderProgram({ lineups, fromTime, toTime }) {
  // get css var from dom js
  // getComputedStyle(element).getPropertyValue('--color-font-general');

  return html`
    <style>
      /**
       * top level container
       */
      .program {
        --padding: var(--mdc-layout-grid-margin-desktop, 24px);
        --head-width: calc(100vw * 2 / 3);
        --slot-width: calc(100vw / 2.5 / 4);
      }
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
          --slot-width: calc(100vw / 6 / 4);
        }
      }

      /**
       * Days and time ticks
       */
      .timeline {
        display: flex;
        width: max-content;
        background-color: var(--hc-background-color);
        box-sizing: border-box;
        padding: var(--padding);
      }
      .timeline__header {
        min-width: var(--head-width);
        text-align: center;
      }
      .timeline__content {
        display: flex;
      }
      .timeline__tick {
        width: var(--slot-width);
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
        padding: var(--padding);
      }
      .lineup__content {
        display: flex;
        align-items: center;
      }
      .lineup__slot {
        width: var(--slot-width);
        height: 90%;
      }

      /**
       * Event filled to slots
       */
      .event {
        background-color: var(--hc-background-color);
        height: 100%;
      }
      .event.event--start {
      }
      .event.event--end {
      }

      /**
       * Add event button
       */
      .lineup__slot .add-event {
        opacity: 0;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .lineup__slot .add-event:hover {
        opacity: 1;
      }
      .lineup__slot .add-event .hc-button {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        padding: 0;
        cursor: pointer;
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
        <div class="timeline">
          <div class="timeline__header">
            <span>Sobota</span>
          </div>
          <div class="timeline__content">
            ${makeTimeline(fromTime, toTime).map(
              (time) => html`
                <div class="timeline__tick">${makeTick(time)}</div>
              `
            )}
          </div>
        </div>
        ${lineups.map(
          ({ name, desc }) => html`
            <div class="lineup">
              <div class="lineup__header">
                <h2>${name}</h2>
                <p>${desc}</p>
              </div>
              <div class="lineup__content">
                ${makeTimeline(fromTime, toTime).map(
                  (time) =>
                    html`
                      <div class="lineup__slot" data-time=${time.toISOString()}>
                        ${renderEvent(time) ?? renderAddButton(time)}
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
