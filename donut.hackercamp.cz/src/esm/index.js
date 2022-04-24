export async function main({ searchParams, slackButton, env }) {
  const apiURL = (endpoint) => new URL(endpoint, env["api-host"]).href;

  if (localStorage.getItem("hc:id_token")) {
    slackButton.style.display = "none";
  }

  if (searchParams.has("code")) {
    const code = searchParams.get("code");
    const resp = await fetch(apiURL("auth"), {
      method: "POST",
      body: new URLSearchParams({ code }),
    });
    const data = await resp.json();
    if (resp.ok && data.ok) {
      const { idToken, slackToken, slackProfile } = data;
      localStorage.setItem("hc:id_token", idToken);
      localStorage.setItem("slack:id_token", slackToken);
      localStorage.setItem("slack:profile", JSON.stringify(slackToken));
      slackButton.style.display = "none";
      console.log(slackProfile);
    } else {
      console.error(data);
    }
  }
}
