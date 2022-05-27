function hideSlackButton(slackButton) {
  slackButton.style.display = "none";
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

export async function main({ searchParams, slackButton, env }) {
  const apiURL = (endpoint) => new URL(endpoint, env["api-host"]).href;

  if (localStorage.getItem("hc:id_token")) {
    hideSlackButton(slackButton);
  }

  if (searchParams.has("returnUrl")) {
    localStorage.setItem("hc:returnUrl", searchParams.get("returnUrl"));
  }

  if (searchParams.has("code")) {
    try {
      await authenticate({ searchParams, apiURL });
      window.dispatchEvent(new Event("hc:profile"));
      hideSlackButton(slackButton);
      handleReturnUrl();
    } catch (e) {
      console.error(e);
    }
  }
}
