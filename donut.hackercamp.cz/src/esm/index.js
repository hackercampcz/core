export async function main({ searchParams, slackButton, env }) {
  if (localStorage.getItem("hc:id_token")) {
    slackButton.style.display = "none";
  }
  if (searchParams.has("code")) {
    const code = searchParams.get("code");
    const { resp, data } = await fetch(new URL("auth", env["api-host"]), {
      method: "POST",
      body: new URLSearchParams({ code }),
    });
    if (resp.ok && data.ok) {
      const { idToken } = data;
      localStorage.setItem("hc:id_token", idToken);
      slackButton.style.display = "none";
      console.log(data);
    } else {
      console.error(data);
    }
  }
}
