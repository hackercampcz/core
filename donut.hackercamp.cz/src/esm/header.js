import { html, render } from "lit";

function headerProfile({ name, picture }) {
  return html`<span class="hc-header__profile-detail">
    <button class="hc-header__profile-photo" title="Profile menu">
      <img alt="${name}" src="${picture}" width="48" height="48" />
    </button>
  </span>`;
}

function renderProfile(profile, profileEl) {
  if (!profile) return;
  render(headerProfile(profile), profileEl);
}

function getProfile() {
  return JSON.parse(localStorage.getItem("slack:profile"));
}

export async function init({ profile: profileEl }) {
  const profile1 = getProfile();
  renderProfile(profile1, profileEl);

  window.addEventListener("hc:profile", (e) => {
    const profile = getProfile();
    renderProfile(profile, profileEl);
  });
}
