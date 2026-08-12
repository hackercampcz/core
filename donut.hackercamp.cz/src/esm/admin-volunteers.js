import "@material/mwc-drawer/mwc-drawer.js";
import { html, render } from "lit-html";
import { map } from "lit-html/directives/map.js";
import { getSlackProfile, setReturnUrl, signOut } from "./lib/profile.js";
import { withAuthHandler } from "./lib/remoting.js";
import * as rollbar from "./lib/rollbar.js";
import "./components/phone-button.js";
import "./components/mail-button.js";

async function fetchData({ endpoint, year, page, query }, apiHost) {
  const params = new URLSearchParams({ year });
  const resource = new URL(`admin/${endpoint}?${params}`, apiHost).href;
  const resp = await withAuthHandler(fetch(resource, { credentials: "include" }), {
    onUnauthenticated() {
      setReturnUrl(location.href);
      return new Promise((resolve, reject) => {
        signOut(path => new URL(path, apiHost).href);
        reject({ unauthenticated: true });
      });
    },
    onUnauthorized() {
      return Promise.reject({ unauthorized: true });
    }
  });
  return resp.json();
}

function activity(
  {
    volunteerBar,
    volunteerConstruction,
    volunteerDriver,
    volunteerInfoDeskAndRegistration,
    volunteerSport
  }
) {
  return [
    volunteerBar ? "bar" : null,
    volunteerConstruction ? "stavím" : null,
    volunteerDriver ? "řídím" : null,
    volunteerInfoDeskAndRegistration ? "registrace" : null,
    volunteerSport ? "sport" : null
  ].filter(Boolean).join(", ");
}
const day = new Map(
  [["th", "čtvrtek"], ["we", "středa"]]
);

export async function main({ env, yearSelector, searchParams, appRoot }) {
  rollbar.init(env);

  const year = parseInt(searchParams.get("year") ?? env.year);
  const apiHost = env["api-host"];
  const profile = getSlackProfile();
  rollbar.configure({
    transform(payload) {
      payload.state = {
        year
      };
    },
    payload: { person: { name: profile?.real_name, email: profile.email, id: profile.id } }
  });

  yearSelector.value = year;
  yearSelector.addEventListener("change", e => {
    location.assign(`?${new URLSearchParams({ year: e.target.value })}`);
  });

  const data = await fetchData({ endpoint: "volunteers", year }, apiHost);
  render(
    html`
    <table>
      <thead>
      <tr>
        <th scope="col">Jméno</th>
        <th scope="col">Příjezd</th>
        <th scope="col">Aktivita</th>
        <th scope="col">Akce</th>
      </tr>
      </thead>
      <tbody>
      ${
      map(data, x =>
        html`
        <tr>
          <td>${x.firstName} ${x.lastName}</td>
          <td>${day.get(x.volunteerArrivalDay)}</td>
          <td>${activity(x)}</td>
          <td>
            <span class="hc-detail__tools">
                <hc-mail-button email="${x.email}"></hc-mail-button>
                <hc-phone-button phone="${x.phone}"></hc-phone-button>
              </span>
            </td>
        </tr>`)
    }
      </tbody>
    </table>`,
    appRoot
  );
}
