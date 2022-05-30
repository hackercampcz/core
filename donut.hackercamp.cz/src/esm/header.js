import { defAtom } from "@thi.ng/atom";
import { html, render } from "lit-html";
import { when } from "lit-html/directives/when.js";

const state = defAtom({
  profile: null,
  idPopupVisible: false,
  view: renderProfile,
});

function signOut() {
  localStorage.clear();
  location.assign("/");
}

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
  return JSON.parse(localStorage.getItem("slack:profile"));
}

function renderScheduler() {
  let uiUpdateId;
  let isFirstUpdate = true;
  return ({ preFirstRender, render }) => {
    if (uiUpdateId) {
      cancelAnimationFrame(uiUpdateId);
      uiUpdateId = null;
    }
    uiUpdateId = requestAnimationFrame(() => {
      if (isFirstUpdate) {
        isFirstUpdate = false;
        preFirstRender();
      }
      render();
    });
  };
}

function loadProfile() {
  state.swap((x) => Object.assign(x, { profile: getProfile() }));
}

export async function init({ profile: root }) {
  const scheduleRendering = renderScheduler();
  state.addWatch("render", (id, prev, curr) => {
    const { view } = curr;
    if (typeof view !== "function") return;
    scheduleRendering({
      preFirstRender() {
        root.innerHTML = null;
      },
      render() {
        render(view(curr), root);
      },
    });
  });

  loadProfile();

  window.addEventListener("hc:profile", (e) => {
    loadProfile();
  });
}
