import { defAtom } from "@thi.ng/atom";
import { html } from "lit-html";
import { when } from "lit-html/directives/when.js";
import { signOut } from "./lib/profile.js";
import { initRenderLoop } from "./lib/renderer.js";
import * as workbox from "./lib/workbox.js";

const state = defAtom({
  profile: null,
  idPopupVisible: false,
  view: renderProfile,
});

function headerProfile({ name, picture }, togglePopup) {
  return html`<span class="hc-header__profile-detail">
    <button
      class="hc-header__profile-photo"
      title="Profile menu"
      @click="${() => togglePopup()}"
    >
      <img alt="${name}" src="${picture}" width="48" height="48" />
    </button>
  </span>`;
}

function headerProfilePopup({ name, picture }, signOut) {
  return html`<div class="hc-popup">
    <ul>
      <li>
        <div class="hc-header__profile-photo">
          <img alt="${name}" src="${picture}" width="48" height="48" />
        </div>
        <div class="hc-header__profile-name">
          <strong>${name}</strong>
        </div>
      </li>
      <li>
        <button class="hc-btn hc-btn__sign-out" @click="${() => signOut()}">
          Odhlásit se
        </button>
      </li>
    </ul>
  </div>`;
}

function header(profile, isPopupVisible, togglePopup) {
  return html`
    ${headerProfile(profile, togglePopup)}
    ${when(isPopupVisible, () => headerProfilePopup(profile, signOut))}
  `;
}

function renderProfile({ profile, isPopupVisible }) {
  if (!profile) return;
  return header(profile, isPopupVisible, () => {
    state.swap((x) =>
      Object.assign({}, x, { isPopupVisible: !isPopupVisible })
    );
  });
}

function getProfile() {
  const item = localStorage.getItem("slack:profile");
  if (!item) return null;
  return JSON.parse(item);
}

function loadProfile() {
  const profile = getProfile();
  return state.swap((x) => Object.assign(x, { profile }));
}

export async function init({ profile: root }) {
  workbox.init(() => {
    // TODO: show notification about update
  });
  initRenderLoop(state, root);
  loadProfile();
  window.addEventListener("hc:profile", loadProfile);
}
