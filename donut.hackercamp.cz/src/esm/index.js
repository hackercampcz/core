import { render, html } from "lit-html";
import * as rollbar from "./lib/rollbar.js";

function hideSlackButton(slackButton, slackProfile) {
  slackButton.innerHTML = "";
  const profileLink = `https://app.slack.com/client/T01V4Q0ACQ4/C01V4Q0AZ0U/user_profile/${slackProfile.sub}`;
  render(
    html`
      <p>
        Brzy tady najdeš svůj profil, výběr ubytování, program a seznamovací
        hru. Mezi tím si
        <a href="${profileLink}">doplň svůj profil na Slacku</a> nebo
        <a href="/registrace/">uprav svoji registraci</a>.
      </p>
    `,
    slackButton
  );
}

async function authenticate({ searchParams, apiURL }) {
  const code = searchParams.get("code");
  const resp = await fetch(apiURL("auth"), {
    method: "POST",
    body: new URLSearchParams({ code }),
    credentials: "include",
  });
  const data = await resp.json();
  if (resp.ok && data.ok) {
    const { idToken, slackToken, slackProfile } = data;
    localStorage.setItem("hc:id_token", idToken);
    localStorage.setItem("slack:id_token", slackToken);
    localStorage.setItem("slack:profile", JSON.stringify(slackProfile));
    return slackProfile;
  } else {
    throw new Error("Authentication error", { cause: data });
  }
}

function handleReturnUrl() {
  const returnUrl = localStorage.getItem("hc:returnUrl");
  if (!returnUrl) return;
  localStorage.removeItem("hc:returnUrl");
  location.assign(returnUrl);
}

function signOut() {
  localStorage.removeItem("hc:id_token");
  localStorage.removeItem("slack:id_token");
  localStorage.removeItem("slack:profile");
  window.dispatchEvent(new Event("hc:profile"));
}

export async function main({ searchParams, slackButton, env }) {
  rollbar.init(env);
  const apiURL = (endpoint) => new URL(endpoint, env["api-host"]).href;

  if (
    searchParams.has("returnUrl") &&
    searchParams.get("state") === "not-authenticated"
  ) {
    signOut();
  }

  if (localStorage.getItem("hc:id_token")) {
    hideSlackButton(
      slackButton,
      JSON.parse(localStorage.getItem("slack:profile"))
    );
  }

  if (searchParams.has("returnUrl")) {
    localStorage.setItem("hc:returnUrl", searchParams.get("returnUrl"));
  }

  if (searchParams.has("code")) {
    try {
      const slackProfile = await authenticate({ searchParams, apiURL });
      window.dispatchEvent(new Event("hc:profile"));
      hideSlackButton(slackButton, slackProfile);
      handleReturnUrl();
    } catch (e) {
      console.error(e);
    }
  }
}
