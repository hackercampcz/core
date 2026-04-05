import { getSlackProfile } from "./lib/profile.js";
import * as rollbar from "./lib/rollbar.js";

export async function main({ env, form, modal }) {
  rollbar.init(env);

  const year = parseInt(env.year);
  const profile = getSlackProfile();
  rollbar.configure({
    transform(payload) {
      payload.state = {
        year
      };
    },
    payload: { person: { name: profile.real_name, email: profile.email, id: profile.sub } }
  });

  try {
    const {email, sub: slackID} = profile;
    const response = await fetch(
      `${env["api-host"]}registration?${new URLSearchParams({email, year, slackID})}`,
      {headers: {Accept: "application/json"}},
    );
    const data = await response.json();
    form.year.value = year;
    form.email.value = email;
    form.activity.value = data.activity ?? "";
    form.activityCrew.value = data.activityCrew ?? "";
    form.activityPlace.value = data.activityPlace ?? "";
  } catch (err) {
    rollbar.error(err);
    alert("Něco se kouslo, zkuste to jindy.");
  }

  form.addEventListener("submit", async e => {
    const resp = await fetch(`${env["api-host"]}program`, {
      method: "POST",
      credentials: "include",
      mode: "cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(new FormData(e.target)),
      referrerPolicy: "no-referrer",
    });
    globalThis.showSnackbar(resp.ok ? "Data uložena" : "Došlo k chybě");
    if (!resp.ok) {
      rollbar.error(await resp.json());
    }
    modal.close();
  });
}
