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

export function renderAddEvent() {
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
              transact((x) => Object.assign(x, { view: renderTalk }));
            }}
            >Mainframe</a
          >
        </div>
        <div>
          <p>Data. Dev. Hacks.</p>
          <a class="hc-link--decorated" href="#">Basecamp</a>
        </div>
      </div>
      <div class="hc-card hc-card--decorated">
        <h3>Workshop</h3>
        <a class="hc-link--decorated" href="#">Backend</a>
      </div>
      <div class="hc-card hc-card--decorated">
        <h3>Sport / Meditace</h3>
        <a class="hc-link--decorated" href="#">PeopleWare</a>
      </div>
      <div class="hc-card hc-card--decorated">
        <h3>Hudební program</h3>
        <a class="hc-link--decorated" href="#"
          >WoodStack /<br />Jungle release</a
        >
      </div>
      <div class="hc-card hc-card--decorated">
        <h3>Další / jiný doprovodný program</h3>
        <a class="hc-link--decorated" href="#">Doprovodný program</a>
      </div>
    </section>
    <hr />
    <button name="close">Zavřít</button>
  `;
}

export function renderTalk({ apiUrl, profile, year }) {
  return html`
    <h2>Talk / Přednáška / Diskuse</h2>
    <p>Byznys. Life. NGOs. BioHacks. Byznys stories</p>
    <form method="post" action="${apiUrl}program">
      <input type="hidden" name="type" value="talk" />
      <input type="hidden" name="slackID" value=${profile.sud} />
      <input type="hidden" name="year" value=${year} />
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
      <button type="submit" class="hc-button">Odeslat to</button>
    </form>
  `;
}

export function init(rootElement, { apiUrl, profile }) {
  initRenderLoop(state, rootElement);
  transact((x) => Object.assign(x, { view: renderAddEvent, apiUrl, profile }));
}
