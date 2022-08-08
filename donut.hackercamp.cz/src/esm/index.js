import { defAtom } from "@thi.ng/atom";
import { html, render } from "lit-html";
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

const state = defAtom({
  attendee: null,
  contact: null,
  profile: null,
  registration: null,
  view: renderIndex,
});

async function authenticate({ searchParams, apiURL }) {
  const code = searchParams.get("code");
  const resp = await fetch(apiURL("auth"), {
    method: "POST",
    body: new URLSearchParams({ code }),
    credentials: "include",
  });
  const data = await resp.json();
  if (resp.ok && data.ok) {
    return signIn(data);
  } else {
    throw new Error("Authentication error", { cause: data });
  }
}

async function setDonutProfileUrl(user, token, slug) {
  const profile = await slack.getSlackProfile(user, token);
  if (!profile.fields.Xf039UMCJC1G?.value) {
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

function renderPaidScreen() {
  return html`
    <div>
      <p>
        Děkujeme za registraci a zaplacení faktury. Teď si můžeš vybrat svoje
        ubytování.
      </p>
      <a class="hc-link--decorated" href="/ubytovani/">Vybrat si ubytování</a>
    </div>
  `;
}

function renderIndex({ profile, contact, registration, attendee }) {
  console.log({ profile, contact, registration });
  if (registration.paid || attendee?.ticketType === "crew") {
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
  const [contact, registration, attendee] = await Promise.all([
    getContact(profile.sub, profile.email, apiURL),
    getRegistration(profile.sub, profile.email, year, apiURL),
    getAttendee(profile.sub, year, apiURL),
  ]);
  state.swap((x) =>
    Object.assign({}, x, { profile, contact, registration, attendee })
  );
  setContact(contact);
  setDonutProfileUrl(profile.sub, getSlackAccessToken(), contact.slug);
}

export async function main({ searchParams, slackButton, env }) {
  rollbar.init(env);
  initRenderLoop(state, slackButton);
  const apiURL = (endpoint) => new URL(endpoint, env["api-host"]).href;

  if (
    searchParams.has("returnUrl") &&
    searchParams.get("state") === "not-authenticated"
  ) {
    setReturnUrl(searchParams.has("returnUrl"));
    signOut();
  }

  if (isSignedIn()) {
    const profile = getSlackProfile();
    const year = 2022;
    await loadData(profile, year, apiURL);
  }

  if (searchParams.has("returnUrl")) {
    setReturnUrl(searchParams.get("returnUrl"));
  }

  if (searchParams.has("code")) {
    try {
      await authenticate({ searchParams, apiURL });
      handleReturnUrl();
    } catch (e) {
      console.error(e);
    }
  }
}
