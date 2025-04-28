import { formatMoney } from "@hackercamp/lib/format.js";
import { housingToText } from "@hackercamp/lib/housing.js";
import { defAtom } from "@thi.ng/atom";
import { html } from "lit-html";
import { map } from "lit-html/directives/map.js";
import { when } from "lit-html/directives/when.js";
import {
  getContact,
  getSlackAccessToken,
  getSlackProfile,
  handleReturnUrl,
  isSignedIn,
  setReturnUrl,
  signIn,
  signOut
} from "./lib/profile.js";
import { withAuthHandler } from "./lib/remoting.js";
import { initRenderLoop } from "./lib/renderer.js";
import * as rollbar from "./lib/rollbar.js";
import * as slack from "./lib/slack.js";
import { setSlackProfile } from "./lib/slack.js";

/** @typedef {import("@thi.ng/atom").IAtom} IAtom */
/** @typedef {import("@thi.ng/atom").Path} Path */
/** @typedef {import("@thi.ng/atom").SwapFn} SwapFn */

/** @enum */
const View = {
  loading: "loading",
  dashboard: "dashboard",
  selectHousing: "select-housing",
  paymentPending: "payment-pending",
  notRegistered: "not-registered"
};

const state = defAtom({
  attendee: null,
  contact: null,
  profile: null,
  registration: null,
  view: renderIndex,
  forcedView: null,
  hasRegisteredHackers: false,
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
  }
});

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

if (__DEVELOPMENT__) {
  // Global exports for DX
  globalThis.transact = transact;
  globalThis.swapIn = swapIn;
  globalThis.getState = () => state.deref();
  globalThis.setView = (view) => swapIn("forcedView", () => view);
  globalThis.View = View;
}

async function authenticate({ searchParams, apiURL }) {
  const code = searchParams.get("code");
  const resp = await fetch(apiURL("auth"), {
    method: "POST",
    body: new URLSearchParams({ code }),
    credentials: "include"
  });
  if (resp.ok) {
    const data = await resp.json();
    if (data.ok) return signIn(data, apiURL);
  }
  const data = await resp.text();
  throw new Error("Authentication error", { cause: data });
}

async function setDonutProfileUrl(user, token, slug, company) {
  // TODO: extended user permissions (aka Add to Slack, see Admin)
  const profile = await slack.getSlackProfile(user, token);
  if (!profile?.fields?.Xf039UMCJC1G?.value) {
    await setSlackProfile(user, token, { name: "Xf039UMCJC1G", value: `https://donut.hckr.camp/hackers/${slug}/` });
    console.log("Donut URL set");
  }
  if (!profile.fields.Xf03A7A5815F?.value) {
    await setSlackProfile(user, token, { name: "Xf03A7A5815F", value: { alt: company } });
    console.log("Company set");
  }
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
    }
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
    }
  });
  return resp.json();
}

async function getNfcTronData(attendee, apiUrl) {
  for (const chip of attendee.nfcTronData?.filter((x) => x.sn) ?? []) {
    const params = new URLSearchParams({ chipID: chip.chipID });
    const resp = await fetch(apiUrl(`nfctron?${params}`), { headers: { Accept: "application/json" } });
    const data = await resp.json();
    chip.spent = data.totalSpent / 100; // NFCTron has spent in halíř
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
        </div>
      </div>
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        ${plusOneCard(referralLink)}
      </div>
    </div>
  `;
}

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
          >v kanále <code>#spolujizda</code></a>
          nebo se
          <a href="/spolujizda">vyplnit v tabulce Spolujízda</a>.
        </p>
      `;
    case "free-car":
      return html`
        <p>
          Les na Sobeňáku má omezenou parkovací kapacitu, proto je potřeba
          zaplnit auta co to jde. Je super, že nabízíš místo dalším hackerům.
          Můžete se
          <a href="https://hackercampworkspace.slack.com/archives/C0278R69JUQ"
          >domluvit v kanále <code>#spolujizda</code></a>
          nebo rovnou nabídnout své kapacity
          <a href="/spolujizda">v tabulce Spolujízda</a>.
        </p>
      `;
    default:
      return null;
  }
}

function housedCardTemplate({ housing, housingPlacement, travel, hasRegisteredHackers }) {
  return html`
    <div class="hc-card hc-card--decorated">
      <p>
        Jsi ubytovaný ${housingText(housing, housingPlacement)}, dle tvého
        výběru.
      </p>
      <p>
        Do
        <date datetime="2023-08-21">21. srpna</date>
        si ještě můžeš
        <a class="hc-link" href="/ubytovani/">změnit ubytování</a>.
      </p>
      ${travelText(travel)}
      ${when(hasRegisteredHackers, () => html`
        <p>
          Chceš se podívat, kdo už se na tebe těší? Tak tady je
          <a href="/hackers/">seznam účastníků</a>.
        </p>`
      )}
    </div>
  `;
}

function nfcTronTemplate({ nfcTronData, checkOutPaid }) {
  if (!nfcTronData) return null;
  const chips = nfcTronData.filter((x) => x.sn);
  const total = chips.reduce((acc, x) => acc + (x.spent ?? x.totalSpent), 0);
  return html`
    <div class="hc-card hc-card--decorated">
      <h2>Útrata</h2>
      ${when(total > 0, () => html`
        <p>
          Celkem:
          <strong>
            <data value="${total}">${formatMoney(total)}</data>
          </strong>
        </p>
      `)}
      <ul>
        ${map(chips, (x) => html`
          <li data-chip-id="${x.chipID}" data-chip-sn="${x.sn}">
            SN chipu:
            <code title="SN najdete na zadní straně čipu - pod páskem">${x.sn.toUpperCase()}</code>
            -
            ${when(checkOutPaid || x.paid,
              () => html`<strong style="color: forestgreen">Zaplaceno</strong>`,
              () => html`
                <strong style="color: darkred">Nezaplaceno
                  <data value="${x.spent ?? x.totalSpent}">${formatMoney(x.spent ?? x.totalSpent)}</data>
                </strong>
              `
            )}
            <a href="https://pass.nfctron.com/receipt/${x.chipID}" target="nfcTron">Účet</a>
          </li>
        `)}
      </ul>
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
      <p>Pokud chceš ukázat atmosféru kempu, můžeš použít tato videa:</p>
      <iframe
        class="responsive"
        width="560"
        height="315"
        src="https://www.youtube-nocookie.com/embed/igM6UFAqaOQ?hl=cs&amp;modestbranding=1"
        title="Hackercamp sestřih po 2021"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
      <iframe
        class="responsive"
        width="560"
        height="315"
        src="https://www.youtube-nocookie.com/embed/xm0Bse4SVRQ?hl=cs&amp;modestbranding=1"
        title="Hackercamp sestřih po 2023"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
      <iframe
        class="responsive"
        width="560"
        height="315"
        src="https://www.youtube-nocookie.com/embed/FCvKBikoXOs?hl=cs&amp;modestbranding=1"
        title="Hackercamp sestřih po 2024"
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
  referralLink,
  hasRegisteredHackers
) {
  return html`
    <div class="mdc-layout-grid__inner">
      <!--div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <div class="hc-card hc-card--decorated">
          <h2>Zpětná vazba</h2>
          <p>
            Doufáme, že už jste se po dalším za nás vydařeném campu pomalu
            vzpamatovali a vrátili se do svého obvyklého rytmu :) Než všechno,
            co se na campu dělo, zapomenete, poprosíme vás o 3 minutky vašeho
            času.
          </p>
          <p>
            <a href="https://hckr.camp/feedback"
              >Dejte nám prosím zpětnou vazbu</a
            >
          </p>
          <p>
            Dotazník má 3 povinné otázky, je to fakt na tři minuty max :) A nám
            vaše zpětka obrovsky pomůže. Výsledky budeme zase jako loni sdílet
            na slacku.
          </p>
        </div>
      </div-->
      <div
        style="${!nfcTronData ? "display: none" : ""}"
        class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12"
      >
        ${nfcTronTemplate({ nfcTronData, checkOutPaid })}
      </div>
      <div
        class="mdc-layout-grid__cell mdc-layout-grid__cell--span-6 mdc-layout-grid__cell--span-8-tablet"
      >
        ${housedCardTemplate({ housing, housingPlacement, travel, hasRegisteredHackers })}
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

function renderIndex({ profile, attendee, selectedView, hasRegisteredHackers }) {
  const referralLink = `https://hckr.camp/r/${profile?.sub}`;
  switch (selectedView) {
    case View.loading:
      return html`<p>Probíhá přihlašovaní. Chvilku strpení&hellip;</p>`;
    case View.dashboard:
      return renderDashboardScreen(attendee, referralLink, hasRegisteredHackers);
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
              ${when(attendee?.invoiceUrl, () => html`
                <p>
                  Platbu můžeše rychle odbavit přes <a href="${attendee.invoiceUrl}">webovou fakturu</a>.
                </p>
              `)}
              ${when(hasRegisteredHackers, () => html`
                <p>
                  Chceš se podívat, kdo už se na tebe těší? Tak tady je
                  <a href="/hackers/">seznam účastníků</a>.
                </p>
              `)}
            </div>
          </div>
          <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
            ${plusOneCard(referralLink)}
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
            <a class="hc-link--decorated" href="/registrace/">Zaregistrovat se</a>
            ${when(hasRegisteredHackers, () => html`
              <p>
                Chceš se nejprve podívat, kdo už se na tebe těší? Tak tady je
                <a href="/hackers/">seznam účastníků</a>.
              </p>
            `)}
          </div>
          <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
            ${plusOneCard(referralLink)}
          </div>
        </div>
      `;
  }
}

async function loadData(profile, year, apiURL) {
  const [registration, attendee] = await Promise.all([
    getRegistration(profile.sub, profile.email, year, apiURL),
    getAttendee(profile.sub, year, apiURL)
  ]);
  if (attendee && !attendee?.nfcTronData?.[0]?.totalSpent) {
    // Get data from NFCTron API only if we don't have them in the database. Typically, during the event.
    // Load them async, because NFCTron API is slow as hell
    getNfcTronData(attendee, apiURL).then((attendee) => swapIn("attendee", () => attendee));
  }
  const contact = getContact();
  transact((x) => Object.assign(x, { profile, contact, registration, attendee }));
  try {
    await setDonutProfileUrl(
      profile.sub,
      getSlackAccessToken(),
      contact.slug,
      registration?.company ?? attendee?.company
    );
  } catch (err) {
    rollbar.error(err);
  }
}

export async function main({ searchParams, rootElement, env }) {
  rollbar.init(env);
  const year = searchParams.get("year") ?? env.year;
  const apiHost = env["api-host"];
  const apiURL = (endpoint) => new URL(endpoint, apiHost).href;

  if (searchParams.has("returnUrl") && searchParams.get("state") === "not-authenticated") {
    setReturnUrl(searchParams.get("returnUrl"));
    return signOut(apiURL);
  }

  initRenderLoop(state, rootElement);

  if (isSignedIn()) {
    transact((x) => Object.assign(x, { apiHost, year, hasRegisteredHackers: env.hasRegisteredHackers }));
    try {
      const profile = getSlackProfile();
      await loadData(profile, year, apiURL);
    } catch (err) {
      rollbar.error(err);
      return signOut(apiURL);
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
    } catch (err) {
      rollbar.error(err);
      signOut(apiURL);
    }
  }
}
