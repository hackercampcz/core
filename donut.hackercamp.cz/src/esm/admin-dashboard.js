import "@material/mwc-drawer/mwc-drawer.js";
import { getSlackProfile, setReturnUrl, signOut } from "./lib/profile.js";
import { withAuthHandler } from "./lib/remoting.js";
import * as rollbar from "./lib/rollbar.js";

async function fetchData({ endpoint, year, page, query }, apiHost) {
  const params = new URLSearchParams({ type: endpoint, year, page, query });
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

export async function main({ env, yearSelector, searchParams }) {
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
    payload: { person: { name: profile.real_name, email: profile.email, id: profile.id } }
  });

  yearSelector.value = year;
  yearSelector.addEventListener("change", e => {
    location.assign(`?${new URLSearchParams({ year: e.target.value, view: selectedView })}`);
  });

  const kuku = await fetchData({ endpoint: "attendees", year, page: 1, query: "" }, apiHost);
  console.log(kuku);
}
