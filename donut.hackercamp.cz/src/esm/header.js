import { html, render } from "lit";

function headerProfile({ name, picture }) {
  return html`<span style="display: flex;align-items: center;gap: 16px">
    <img
      alt=""
      src="${picture}"
      width="48"
      height="48"
      style="border-radius: 50%"
    />
    <strong>${name}</strong></span
  >`;
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
