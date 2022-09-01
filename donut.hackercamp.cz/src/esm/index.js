import { defAtom } from "@thi.ng/atom";
import { html } from "lit-html";
import {
  getSlackAccessToken,
  getSlackProfile,
  handleReturnUrl,
  isSignedIn,
  setContact,
  setReturnUrl,
  signIn,
  signOut,
} from "./lib/profile.js";
import { setSlackProfile } from "./lib/slack.js";
import * as slack from "./lib/slack.js";
import * as rollbar from "./lib/rollbar.js";
import { initRenderLoop } from "./lib/renderer.js";
import { when } from "lit-html/directives/when.js";
import { lineupText } from "./admin.js";
import { renderEventForm } from "./event-form.js";
import { showModalDialog } from "./modal-dialog.js";

const state = defAtom({
  attendee: null,
  contact: null,
  profile: null,
  registration: null,
  program: null,
  view: renderIndex,
  campStartAt: new Date("2022-09-01T14:00:00"),
  campEndAt: new Date("2022-09-04T14:00:00"),
});

async function authenticate({ searchParams, apiURL }) {
  const code = searchParams.get("code");
  const resp = await fetch(apiURL("auth"), {
    method: "POST",
    body: new URLSearchParams({ code }),
    credentials: "include",
  });
  if (resp.ok) {
    const data = await resp.json();
    if (data.ok) return signIn(data);
  }
  const data = await resp.text();
  throw new Error("Authentication error", { cause: data });
}

async function setDonutProfileUrl(user, token, slug) {
  const profile = await slack.getSlackProfile(user, token);
  if (!profile?.fields?.Xf039UMCJC1G?.value) {
    await setSlackProfile(user, token, {
      name: "Xf039UMCJC1G",
      value: `https://donut.hackercamp.cz/hackers/${slug}/`,
    });
    console.log("Donut URL set");
  }
  // if (!profile.fields.Xf03A7A5815F?.value) {
  //   await setSlackProfile(user, token, {
  //     name: "Xf03A7A5815F",
  //     value: { alt: company },
  //   });
  //   console.log("Company set");
  // }
}

async function getContact(slackID, email, apiUrl) {
  const params = new URLSearchParams({ slackID, email });
  const resp = await fetch(apiUrl(`contacts?${params}`), {
    credentials: "include",
  });
  return resp.json();
}

async function getRegistration(slackID, email, year, apiUrl) {
  const params = new URLSearchParams({ slackID, email, year });
  const resp = await fetch(apiUrl(`registration?${params}`));
  return resp.json();
}

async function getAttendee(slackID, year, apiUrl) {
  const params = new URLSearchParams({ slackID, year });
  const resp = await fetch(apiUrl(`attendees?${params}`));
  return resp.json();
}

async function getProgram(year, apiUrl) {
  const params = new URLSearchParams({ year });
  const resp = await fetch(apiUrl(`program?${params}`), {
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  return resp.json();
}

function renderPaidScreen() {
  return html`
    <div>
      <p>
        Děkujeme za registraci a zaplacení faktury. Teď si můžeš vybrat svoje
        ubytování.
      </p>
      <a class="hc-link--decorated" href="/ubytovani/">Vybrat si ubytování</a>
      <p>
        Taky se můžeš podívat na <a href="/program/">předběžný program</a> a
        brzy si budeš moct zadat vlastní návrhy.
      </p>
    </div>
  `;
}

const housingToText = new Map([
  ["own-car", "v tvém autě"],
  ["own-caravan", "ve vlastním karavanu"],
  ["open-air", "pod širákem nebo v hamace"],
  ["own-tent", "ve stanu"],
  ["glamping", "v Glamping stanu"],
  ["cottage", "v chatce"],
  ["nearby", "v okolí"],
  ["house", "v domku"],
]);
const placement = (p) => (p === "custom" ? "" : ` ${p}`);
function housingText(housing, housingPlacement) {
  return html`<strong
    >${housingToText.get(housing) + placement(housingPlacement)}</strong
  >`;
}

function travelText(travel) {
  switch (travel) {
    case "carpool":
      return html`
        <p>
          Chceš pomoci s nalezením odvozu na kemp? Můžeš se domluvit buď
          <a href="https://hackercampworkspace.slack.com/archives/C0278R69JUQ"
            >v kanále <code>#spolujizda</code></a
          >
          nebo se
          <a
            href="https://docs.google.com/spreadsheets/d/1EkthrK_s-5-xxWDHGNudz6PEJs15jk0Jd6UWyeipAAI/edit#gid=0"
            >vyplnit v tabulce Spolujízda</a
          >.
        </p>
      `;
    case "free-car":
      return html` <p>
        Les na Sobeňáku má omezenou parkovací kapacitu, proto je potřeba zaplnit
        auta co to jde. Je super, že nabízíš místo dalším hackerům. Můžete se
        <a href="https://hackercampworkspace.slack.com/archives/C0278R69JUQ"
          >domluvit v kanále <code>#spolujizda</code></a
        >
        nebo rovnou nabídnout své kapacity
        <a
          href="https://docs.google.com/spreadsheets/d/1EkthrK_s-5-xxWDHGNudz6PEJs15jk0Jd6UWyeipAAI/edit#gid=0"
          >v tabulce Spolujízda</a
        >.
      </p>`;
    default:
      return null;
  }
}

async function showEventModalDialog(editingEvent) {
  const { apiHost, profile, campStartAt, campEndAt, program } = state.deref();
  const root = document.getElementById("program-modal-root");
  renderEventForm(root, {
    apiHost,
    profile,
    lineupId: editingEvent?.lineup,
    campStartAt,
    campEndAt,
    preferredTime: editingEvent ? new Date(editingEvent.startAt) : undefined,
    events: program,
    selectedTopic: editingEvent?.topic,
    editingEvent,
  });
  showModalDialog("program-modal");
}

function housedCardTemplate({ housing, housingPlacement, travel }) {
  return html` <div class="hc-card hc-card--decorated">
    <p>
      Jsi ubytovaný ${housingText(housing, housingPlacement)}, dle tvého výběru.
    </p>
    ${travelText(travel)}
    <p>
      Chceš se podívat, kdo už se na tebe těší? Tak tady je
      <a href="/hackers/">seznam účastníků</a>.
    </p>
    <p>
      Taky se můžeš podívat na <a href="/program/">předběžný program</a> a brzy
      si budeš moct zadat vlastní návrhy.
    </p>
  </div>`;
}
function programCardTemplate({ events }) {
  return html`
    <div class="hc-card hc-card--decorated">
      <h2>Tvé zapojení do programu</h2>
      ${when(
        events.length,
        () => html`
          <ul style="list-style-type: none; text-align: left; padding: 0;">
            ${events.map(
              (event) =>
                html`
                  <li>
                    <a
                      style="text-decoration: none;"
                      href="#"
                      @click=${() => {
                        showEventModalDialog(event);
                      }}
                    >
                      ${event.title}
                      (<code>${lineupText.get(event.lineup)}</code>) 👈
                      <strong>upravit</strong>
                    </a>
                  </li>
                `
            )}
          </ul>
        `,
        () => html` <p>Hacker Camp bude jen takový, jaký si ho uděláme.</p> `
      )}
      <div style="text-align: center">
        <a
          class="hc-link hc-link--decorated"
          style="font-size: 120%;"
          href="/program"
        >
          Přejít na program
        </a>
      </div>
    </div>
    <dialog id="program-modal">
      <div id="program-modal-root">nah</div>
      <hr />
      <button name="close" type="reset">Zavřít</button>
    </dialog>
  `;
}

function renderDashboardScreen({
  housing,
  housingPlacement,
  travel,
  events = [],
}) {
  return html`
    <div class="mdc-layout-grid__inner">
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        ${programCardTemplate({ events })}
      </div>
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        ${housedCardTemplate({ housing, housingPlacement, travel })}
      </div>
    </div>
  `;
}

const freeTickets = new Set(["crew", "staff"]);
function canSelectHousing(registration, attendee) {
  return registration.paid || freeTickets.has(attendee?.ticketType);
}

function renderIndex({ profile, registration, attendee }) {
  if (!(profile || registration || attendee)) {
    return html`<p>Probíhá přihlašovaní. Chvilku strpení&hellip;</p>`;
  }
  if (attendee?.housingPlacement) {
    return renderDashboardScreen(attendee);
  }
  if (canSelectHousing(registration, attendee)) {
    return renderPaidScreen();
  }
  if (registration && !registration.paid) {
    return html`
      <p>
        Svoje ubytování si budeš moct vybrat až po zaplacení faktury. Tak
        s&nbsp;tím moc neváhej, abys spal / spala podle svých představ&nbsp;:)
      </p>
      <p>
        Chceš se nejprve podívat, kdo už se na tebe těší? Tak tady je
        <a href="/hackers/">seznam účastníků</a>.
      </p>
      <p>
        Taky se můžeš podívat na <a href="/program/">předběžný program</a> a po
        zaplacení si budeš moct zadat vlastní návrhy.
      </p>
      <p>
        Máš zaplaceno, ale pořád vidíš tohle? Pak máme asi nesoulad mezi
        e-mailem v registraci a na Slacku. Napiš Alešovi na Slacku
        <a href="https://hackercampworkspace.slack.com/team/U01UVGVJ5BP"
          ><code>@rarous</code></a
        >
        nebo e-mail na <a href="mailto:rarous@hckr.camp">rarous@hckr.camp</a> a
        on to dá do pořádku.
      </p>
    `;
  }
  return html`
    <div>
      <p>
        Nepropásni první ročník Hacker Campu, bude ještě lepší než ten nultý! A
        to i díky tobě.
      </p>
      <a class="hc-link--decorated" href="/registrace/">Zaregistrovat se</a>
      <p>
        Chceš se nejprve podívat, kdo už se na tebe těší? Tak tady je
        <a href="/hackers/">seznam účastníků</a>.
      </p>
    </div>
  `;
}

async function loadData(profile, year, apiURL) {
  const [contact, registration, attendee, program] = await Promise.all([
    getContact(profile.sub, profile.email, apiURL),
    getRegistration(profile.sub, profile.email, year, apiURL),
    getAttendee(profile.sub, year, apiURL),
    getProgram(year, apiURL),
  ]);
  state.swap((x) =>
    Object.assign({}, x, { profile, contact, registration, attendee, program })
  );
  setContact(contact);
  try {
    await setDonutProfileUrl(profile.sub, getSlackAccessToken(), contact.slug);
  } catch (err) {
    rollbar.error(err);
  }
}

export async function main({ searchParams, rootElement, env }) {
  rollbar.init(env);
  initRenderLoop(state, rootElement);

  const apiURL = (endpoint) => new URL(endpoint, env["api-host"]).href;

  if (
    searchParams.has("returnUrl") &&
    searchParams.get("state") === "not-authenticated"
  ) {
    setReturnUrl(searchParams.has("returnUrl"));
    signOut(apiURL);
  }

  if (isSignedIn()) {
    state.swap((x) => Object.assign(x, { apiHost: env["api-host"] }));
    try {
      const profile = getSlackProfile();
      const year = 2022;
      await loadData(profile, year, apiURL);
    } catch (e) {
      console.error(e);
      signOut(apiURL);
    }
  }

  if (searchParams.has("returnUrl")) {
    setReturnUrl(searchParams.get("returnUrl"));
  }

  if (searchParams.has("code")) {
    try {
      state.swap((x) => Object.assign({}, x));
      await authenticate({ searchParams, apiURL });
      handleReturnUrl();
    } catch (e) {
      console.error(e);
      signOut(apiURL);
    }
  }
}
