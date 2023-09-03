import { formatMoney } from "@hackercamp/lib/format.mjs";
import { defAtom } from "@thi.ng/atom";
import { html } from "lit-html";
import { when } from "lit-html/directives/when.js";
import { renderEventForm } from "./event-form.js";
import {
  getContact,
  getSlackAccessToken,
  getSlackProfile,
  handleReturnUrl,
  isSignedIn,
  setReturnUrl,
  signIn,
  signOut,
} from "./lib/profile.js";
import { withAuthHandler } from "./lib/remoting.js";
import { initRenderLoop } from "./lib/renderer.js";
import * as rollbar from "./lib/rollbar.js";
import { schedule } from "./lib/schedule.js";
import * as slack from "./lib/slack.js";
import { setSlackProfile } from "./lib/slack.js";
import { showModalDialog } from "./modal-dialog.js";
import { lineupText } from "./admin/common.js";
import { map } from "lit-html/directives/map.js";

/** @typedef {import("@thi.ng/atom").SwapFn} SwapFn */
/** @typedef {import("@thi.ng/atom").IAtom} IAtom */

/** @enum */
const View = {
  loading: "loading",
  dashboard: "dashboard",
  selectHousing: "select-housing",
  paymentPending: "payment-pending",
  notRegistered: "not-registered",
};

const state = defAtom({
  attendee: null,
  contact: null,
  profile: null,
  registration: null,
  program: null,
  view: renderIndex,
  forcedView: null,
  campStartAt: new Date(),
  campEndAt: new Date(),
  get selectedView() {
    if (this.forcedView) return this.forcedView;
    if (!(this.profile || this.registration || this.attendee)) {
      return View.loading;
    }
    if (this.attendee?.housingPlacement) {
      return View.dashboard;
    }
    if (canSelectHousing(this.registration, this.attendee)) {
      return View.selectHousing;
    }
    if (this.registration.year && !this.registration.paid) {
      return View.paymentPending;
    }
    return View.notRegistered;
  },
});

/**
 * @param {SwapFn<T, T>} fn
 * @param {IAtom<T>} atom
 */
const transact = (fn, atom = state) => atom.swap(fn);

// Global exports for DX
globalThis.setView = (view) =>
  transact((x) => Object.assign(x, { forcedView: view }));
globalThis.View = View;

async function authenticate({ searchParams, apiURL }) {
  const code = searchParams.get("code");
  const resp = await fetch(apiURL("auth"), {
    method: "POST",
    body: new URLSearchParams({ code }),
    credentials: "include",
  });
  if (resp.ok) {
    const data = await resp.json();
    if (data.ok) return signIn(data, apiURL);
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

async function getRegistration(slackID, email, year, apiUrl) {
  const params = new URLSearchParams({ slackID, email, year });
  const resp = await withAuthHandler(fetch(apiUrl(`registration?${params}`)), {
    onUnauthenticated() {
      setReturnUrl(location.href);
      return new Promise((resolve, reject) => {
        signOut(apiUrl);
        reject({ unauthenticated: true });
      });
    },
  });
  return resp.json();
}

async function getAttendee(slackID, year, apiUrl) {
  const params = new URLSearchParams({ slackID, year });
  const resp = await withAuthHandler(fetch(apiUrl(`attendees?${params}`)), {
    onUnauthenticated() {
      setReturnUrl(location.href);
      return new Promise((resolve, reject) => {
        signOut(apiUrl);
        reject({ unauthenticated: true });
      });
    },
  });
  return resp.json();
}

async function getProgram(year, apiUrl) {
  const params = new URLSearchParams({ year });
  const resp = await withAuthHandler(
    fetch(apiUrl(`program?${params}`), {
      headers: { Accept: "application/json" },
      credentials: "include",
    }),
    {
      onUnauthenticated() {
        setReturnUrl(location.href);
        return new Promise((resolve, reject) => {
          signOut(apiUrl);
          reject({ unauthenticated: true });
        });
      },
    }
  );
  return resp.json();
}

async function getNfcTronData(attendee, apiUrl) {
  for (const chip of attendee.nfcTronData.filter((x) => x.sn)) {
    const params = new URLSearchParams({ chipID: chip.chipID });
    const resp = await fetch(apiUrl(`nfctron?${params}`), {
      headers: { Accept: "application/json" },
    });
    const data = await resp.json();
    chip.spent = data.totalSpent / 100;
  }
  return attendee;
}

function renderPaidScreen(referralLink) {
  return html`
    <div class="mdc-layout-grid__inner">
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <div class="hc-card hc-card--decorated">
          <p>
            Děkujeme za registraci a zaplacení faktury. Teď si můžeš vybrat
            svoje ubytování.
          </p>
          <a class="hc-link--decorated" href="/ubytovani/"
            >Vybrat si ubytování</a
          >
          <!--p>
        Taky se můžeš podívat na <a href="/program/">předběžný program</a> a
        brzy si budeš moct zadat vlastní návrhy.
      </p-->
        </div>
      </div>
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        ${plusOneCard(referralLink)}
      </div>
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
      return html`
        <p>
          Les na Sobeňáku má omezenou parkovací kapacitu, proto je potřeba
          zaplnit auta co to jde. Je super, že nabízíš místo dalším hackerům.
          Můžete se
          <a href="https://hackercampworkspace.slack.com/archives/C0278R69JUQ"
            >domluvit v kanále <code>#spolujizda</code></a
          >
          nebo rovnou nabídnout své kapacity
          <a
            href="https://docs.google.com/spreadsheets/d/1EkthrK_s-5-xxWDHGNudz6PEJs15jk0Jd6UWyeipAAI/edit#gid=0"
            >v tabulce Spolujízda</a
          >.
        </p>
      `;
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
  return html`
    <div class="hc-card hc-card--decorated">
      <p>
        Jsi ubytovaný ${housingText(housing, housingPlacement)}, dle tvého
        výběru.
      </p>
      <p>
        Do <date datetime="2023-08-21">21. srpna</date> si ještě můžeš
        <a class="hc-link" href="/ubytovani/">změnit ubytování</a>.
      </p>
      ${travelText(travel)}
      <p>
        Chceš se podívat, kdo už se na tebe těší? Tak tady je
        <a href="/hackers/">seznam účastníků</a>.
      </p>
      <!--p>
        Taky se můžeš podívat na <a href="/program/">předběžný program</a> a
        brzy si budeš moct zadat vlastní návrhy.
      </p-->
    </div>
  `;
}
function programCardTemplate({ events }) {
  return html`
    <div class="hc-card hc-card--decorated">
      <h2>Tvoje zapojení do programu</h2>
      ${when(
        events.length,
        () => html`
          <ul style="list-style-type: none; text-align: left; padding: 0;">
            ${events.map(
              (event) => html`
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

function nfcTronTemplate({ nfcTronData, checkOutPaid }) {
  if (!nfcTronData) return null;
  const chips = nfcTronData.filter((x) => x.sn);
  const total = chips.reduce((acc, x) => acc + x.spent, 0);
  return html`
    <div class="hc-card hc-card--decorated">
      <h2>Útrata na Hackercampu</h2>
      ${when(
        total > 0,
        () =>
          html`<p>
            Celkem:
            <strong><data value="${total}">${formatMoney(total)}</data></strong>
          </p>`
      )}
      ${map(
        chips,
        (x) => html`
          <div data-chip-id="${x.chipID}" data-chip-sn="${x.sn}">
            <p>
              ${when(
                checkOutPaid || x.paid,
                () =>
                  html`<strong style="color: forestgreen">Zaplaceno</strong>`,
                () =>
                  html`<strong style="color: darkred"
                    >Nezaplaceno
                    <data value="${x.spent}"
                      >${formatMoney(x.spent)}</data
                    ></strong
                  >`
              )}

              <a
                href="https://pass.nfctron.com/receipt/${x.chipID}"
                target="nfcTron"
                >Účtenka</a
              >
            </p>
          </div>
        `
      )}
    </div>
  `;
}

function plusOneCard(referralLink) {
  return html`
    <div class="hc-card hc-card--decorated">
      <h2>Tvoje +1</h2>
      <p>
        Chceš někoho pozvat? Pošli mu tento svůj <strong>+1</strong> link:
        <a href="${referralLink}">
          <code>${referralLink}</code>
        </a>
      </p>
      <p>Pokud chceš ukázat atmosféru kempu, můžeš použít toto video:</p>
      <iframe
        class="responsive"
        width="560"
        height="315"
        src="https://www.youtube.com/embed/Kj2PSYBWKYM"
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
      <p>
        Prosíme, cti zásadu, že
        <em>"co se stalo na campu, zůstane na campu"</em> a nevystavujte ho
        nikde veřejně. Díky 💙
      </p>
    </div>
  `;
}

function renderDashboardScreen(
  { housing, housingPlacement, travel, events = [], nfcTronData, checkOutPaid },
  referralLink
) {
  return html`
    <div class="mdc-layout-grid__inner">
      <div
        style="${!nfcTronData ? "display: none" : ""}"
        class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12"
      >
        ${nfcTronTemplate({ nfcTronData, checkOutPaid })}
      </div>
      <div
        class="mdc-layout-grid__cell mdc-layout-grid__cell--span-6 mdc-layout-grid__cell--span-8-tablet"
      >
        ${housedCardTemplate({ housing, housingPlacement, travel })}
      </div>
      <div
        style="${!events.length ? "display: none" : ""}"
        class="mdc-layout-grid__cell mdc-layout-grid__cell--span-6 mdc-layout-grid__cell--span-8-tablet"
      >
        ${programCardTemplate({ events })}
      </div>
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        ${plusOneCard(referralLink)}
      </div>
      <div
        style="display: none"
        class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12"
      >
        <div class="hc-card hc-card--decorated">
          <!-- TODO: previous year -->
        </div>
      </div>
    </div>
  `;
}

const freeTickets = new Set(["crew", "staff"]);
function canSelectHousing(registration, attendee) {
  return registration.paid || freeTickets.has(attendee?.ticketType);
}

function renderIndex({ profile, attendee, selectedView }) {
  const referralLink = `https://www.hackercamp.cz/registrace/?referral=${profile?.sub}`;
  switch (selectedView) {
    case View.loading:
      return html`<p>Probíhá přihlašovaní. Chvilku strpení&hellip;</p>`;
    case View.dashboard:
      return renderDashboardScreen(attendee, referralLink);
    case View.selectHousing:
      return renderPaidScreen(referralLink);
    case View.paymentPending:
      return html`
        <div class="mdc-layout-grid__inner">
          <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
            <div class="hc-card hc-card--decorated">
              <p>
                Svoje ubytování si budeš moct vybrat až po zaplacení faktury.
                Tak s&nbsp;tím moc neváhej, abys spal / spala podle svých
                představ&nbsp;:)
              </p>
              <p>
                Chceš se podívat, kdo už se na tebe těší? Tak tady je
                <a href="/hackers/">seznam účastníků</a>.
              </p>
              <!--p>
          Taky se můžeš podívat na <a href="/program/">předběžný program</a> a po
          zaplacení si budeš moct zadat vlastní návrhy.
        </p-->
              <p>
                Máš zaplaceno, ale pořád vidíš tohle? Pak máme asi nesoulad mezi
                e-mailem v registraci a na Slacku. Napiš Alešovi na Slacku
                <a href="https://hackercampworkspace.slack.com/team/U01UVGVJ5BP"
                  ><code>@rarous</code></a
                >
                nebo e-mail na
                <a href="mailto:rarous@hckr.camp">rarous@hckr.camp</a> a on to
                dá do pořádku.
              </p>
            </div>
          </div>
          <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
            ${plusOneCard(referralLink)}
          </div>
        </div>
      `;
    default:
      return html`
        <div class="mdc-layout-grid__inner">
          <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
            <p>
              Nepropásni další Hacker Camp, bude ještě lepší než ty minulý! A to
              i díky tobě.
            </p>
            <a class="hc-link--decorated" href="/registrace/"
              >Zaregistrovat se</a
            >
            <p>
              Chceš se nejprve podívat, kdo už se na tebe těší? Tak tady je
              <a href="/hackers/">seznam účastníků</a>.
            </p>
          </div>
          <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
            ${plusOneCard(referralLink)}
          </div>
        </div>
      `;
  }
}

async function loadData(profile, year, apiURL) {
  const [registration, attendee, program] = await Promise.all([
    getRegistration(profile.sub, profile.email, year, apiURL),
    getAttendee(profile.sub, year, apiURL),
    getProgram(year, apiURL),
  ]);
  getNfcTronData(attendee, apiURL).then((attendee) =>
    transact((x) => Object.assign(x, { attendee }))
  );
  const contact = getContact();
  transact((x) =>
    Object.assign(x, { profile, contact, registration, attendee, program })
  );
  try {
    await setDonutProfileUrl(profile.sub, getSlackAccessToken(), contact.slug);
  } catch (err) {
    rollbar.error(err);
  }
}

export async function main({ searchParams, rootElement, env }) {
  rollbar.init(env);
  const year = searchParams.get("year") ?? env.year;
  const apiHost = env["api-host"];

  initRenderLoop(state, rootElement);

  const apiURL = (endpoint) => new URL(endpoint, apiHost).href;

  if (
    searchParams.has("returnUrl") &&
    searchParams.get("state") === "not-authenticated"
  ) {
    setReturnUrl(searchParams.has("returnUrl"));
    signOut(apiURL);
  }

  if (isSignedIn()) {
    transact((x) => Object.assign(x, { apiHost, year }, schedule.get(year)));
    try {
      const profile = getSlackProfile();
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
      transact((x) => Object.assign({}, x));
      await authenticate({ searchParams, apiURL });
      handleReturnUrl();
    } catch (e) {
      console.error(e);
      signOut(apiURL);
    }
  }
}
