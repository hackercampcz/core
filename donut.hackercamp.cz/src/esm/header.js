import { defAtom } from "@thi.ng/atom";
import { html, render } from "lit-html";
import { when } from "lit-html/directives/when.js";
import { getContact, signOut } from "./lib/profile.js";
import { initRenderLoop } from "./lib/renderer.js";
import * as workbox from "./lib/workbox.js";

const state = defAtom({
  apiURL: () => "",
  contact: null,
  profile: null,
  idPopupVisible: false,
  view: renderProfile,
});

function headerProfile({ name, picture }, togglePopup) {
  return html`
    <span class="hc-header__profile-detail">
      <button
        class="hc-header__profile-photo"
        title="Profile menu"
        @click="${() => togglePopup()}"
      >
        <img alt="${name}" src="${picture}" width="48" height="48" />
      </button>
    </span>
  `;
}

function headerProfilePopup(contact, profile, signOut) {
  const name = contact?.name ?? profile.name;
  const image = contact?.image ?? profile.picture;
  const slug = contact?.slug ?? "";
  const { is_admin } = profile;
  const { apiURL } = state.deref();
  return html`
    <div class="hc-popup">
      <ul>
        <li>
          <div class="hc-header__profile-photo">
            <a href="/hackers/${slug}">
              <img alt="${name}" src="${image}" width="48" height="48" />
            </a>
          </div>
          <div class="hc-header__profile-name">
            <a href="/hackers/${slug}">
              <strong>${name}</strong>
            </a>
          </div>
        </li>
        ${
    when(
      is_admin,
      () =>
        html`
            <li>
              <a href="/admin/">Administrace</a>
            </li>
          `,
    )
  }
        <!--li>
          <a href="/program/">Program kempu</a>
        </li-->
        <li>
          <a href="/hackers/">Seznam účastníků</a>
        </li>
        <li>
          <a href="https://www.hackercamp.cz/faq/">Často kladené dotazy</a>
        </li>
        <li>
          <button
            class="hc-btn hc-btn__sign-out"
            @click="${() => signOut(apiURL)}"
          >
            Odhlásit se
          </button>
        </li>
      </ul>
    </div>
  `;
}

function header(profile, contact, isPopupVisible, togglePopup) {
  return html`
    ${headerProfile(profile, togglePopup)}
    ${when(isPopupVisible, () => headerProfilePopup(contact, profile, signOut))}
  `;
}

function renderProfile({ profile, contact, isPopupVisible }) {
  if (!profile) return;
  return header(profile, contact, isPopupVisible, () => {
    state.swap((x) => Object.assign({}, x, { isPopupVisible: !isPopupVisible }));
  });
}

function getProfile() {
  const item = localStorage.getItem("slack:profile");
  if (!item) return null;
  return JSON.parse(item);
}

function loadProfile() {
  const profile = getProfile();
  const contact = getContact();
  if (!profile && !contact) return;

  return state.swap((x) => Object.assign(x, { profile, contact }));
}

export async function init({ profile: root, env }) {
  workbox.init((wb) => () => {
    if (globalThis.snackbar) {
      const snackbar = globalThis.snackbar;
      snackbar.labelText = "Je k dispozici nová verze.";
      snackbar.timeoutMs = -1;
      const update = () => {
        wb.addEventListener("controlling", () => location.reload(), true);
        wb.messageSkipWaiting();
      };
      render(
        html`<md-text-button slot="action" @click="${update}"
          >AKTUALIZOVAT</md-text-button
        >`,
        snackbar,
      );
      snackbar.show();
    }
  });
  const apiURL = (endpoint) => new URL(endpoint, env["api-host"]).href;
  state.resetIn(["apiURL"], apiURL);
  initRenderLoop(state, root);
  loadProfile();
  window.addEventListener("hc:profile", loadProfile);
}
