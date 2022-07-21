import { html, render } from "lit-html";
import {
  getSlackProfile,
  handleReturnUrl,
  isSignedIn,
  setReturnUrl,
  signIn,
  signOut,
} from "./lib/profile.js";
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
    return signIn(data);
  } else {
    throw new Error("Authentication error", { cause: data });
  }
}

export async function main({ searchParams, slackButton, env }) {
  rollbar.init(env);
  const apiURL = (endpoint) => new URL(endpoint, env["api-host"]).href;

  if (
    searchParams.has("returnUrl") &&
    searchParams.get("state") === "not-authenticated"
  ) {
    setReturnUrl(searchParams.has("returnUrl"));
    signOut();
  }

  if (isSignedIn()) {
    hideSlackButton(slackButton, getSlackProfile());
  }

  if (searchParams.has("returnUrl")) {
    setReturnUrl(searchParams.get("returnUrl"));
  }

  if (searchParams.has("code")) {
    try {
      const slackProfile = await authenticate({ searchParams, apiURL });
      hideSlackButton(slackButton, slackProfile);
      handleReturnUrl();
    } catch (e) {
      console.error(e);
    }
  }
}
