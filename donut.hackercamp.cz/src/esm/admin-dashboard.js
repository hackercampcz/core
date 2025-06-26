import "@material/mwc-drawer/mwc-drawer.js";
import Chart from "chart.js/auto";
import "chartjs-adapter-date-fns";
import { eachDayOfInterval } from "date-fns/eachDayOfInterval";
import { formatISO } from "date-fns/formatISO";
import { cs } from "date-fns/locale";
import { getSlackProfile, setReturnUrl, signOut } from "./lib/profile.js";
import { withAuthHandler } from "./lib/remoting.js";
import * as rollbar from "./lib/rollbar.js";

Chart.defaults.font.size = 12;
Chart.defaults.font.family = "'PT Mono', system-ui, sans-serif";

async function fetchData({ endpoint, year, page, query }, apiHost) {
  const resource = new URL(`admin/${endpoint}`, apiHost).href;
  const resp = await withAuthHandler(fetch(resource), {
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
function cumulative(arr) {
  const result = arr.map(x => x);
  for (let i = 1; i < arr.length; i++) {
    result[i] += result[i - 1];
  }
  return result;
}

function drawChart(year, data) {
  const el = document.querySelector(`#registrations-${year} canvas`);
  const yearData = data[year];
  const yearMap = new Map(yearData);
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-09-30`);
  const days = eachDayOfInterval({ start, end });
  const fuckingHell = [];
  for (const day of days) {
    const shit = yearMap.get(formatISO(day, { representation: "date" })) ?? [0, 0, 0];
    fuckingHell.push(shit);
  }
  new Chart(el.getContext("2d"), {
    data: {
      labels: days,
      datasets: [
        { type: "line", label: "Registrovaní", data: cumulative(fuckingHell.map(x => x[0])), pointRadius: 0 },
        { type: "line", label: "Vyfakturovaní", data: cumulative(fuckingHell.map(x => x[1])), pointRadius: 0 },
        { type: "line", label: "Zaplacení", data: cumulative(fuckingHell.map(x => x[2])), pointRadius: 0 }
      ]
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
            displayFormats: { day: "d. MMM" }
          },
          adapters: { date: { locale: cs } }
        },
        y: {
          suggestedMax: 300,
          beginAtZero: true
        }
      }
    }
  });
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

  const data = await fetchData({ endpoint: "dashboard" }, new URL("/v2/", apiHost).href);
  const years = Object.fromEntries(data);
  drawChart("2025", years);
  drawChart("2024", years);
  drawChart("2023", years);
  drawChart("2022", years);
}
