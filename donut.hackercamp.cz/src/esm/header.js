import { html, render } from "lit";

function headerProfile(profile) {
  return html`<span style="display: flex;"
    ><img
      alt=""
      src="${profile.picture}"
      width="48"
      height="48"
      style="border-radius: 50%"
    />${profile.name}</span
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
