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

const htmlLegendPlugin = {
  id: "htmlLegend",
  afterUpdate(chart, args, options) {
    const container = document.querySelector(options.containerSelector);
    if (!container) {
      return console.warn("Legend container not found: " + options.containerSelector);
    }
    const ul = container.querySelector("ul");

    // Reuse the built-in legendItems generator
    const items = chart.options.plugins.legend.labels.generateLabels(chart);

    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const li = document.createElement("li");
      li.addEventListener("click", () => {
        const { type } = chart.config;
        if (new Set(["pie", "doughnut"]).has(type)) {
          // Pie and doughnut charts only have a single dataset and visibility is per item
          chart.toggleDataVisibility(item.index);
        } else {
          chart.setDatasetVisibility(item.datasetIndex, !chart.isDatasetVisible(item.datasetIndex));
        }
        chart.update();
      });

      // Color box
      const boxSpan = document.createElement("span");
      boxSpan.classList.add("color");
      boxSpan.style.setProperty("--color", item.strokeStyle);

      // Text
      const textContainer = document.createElement("span");
      textContainer.classList.add("legend");
      textContainer.textContent = item.text;

      li.appendChild(boxSpan);
      li.appendChild(textContainer);
      fragment.appendChild(li);
    }
    ul.replaceChildren(fragment);
  }
};

async function fetchData({ endpoint, year, page, query }, apiHost) {
  const resource = new URL(`admin/${endpoint}`, apiHost).href;
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

function cumulative(arr) {
  const result = arr.map(x => x);
  for (let i = 1; i < arr.length; i++) {
    result[i] += result[i - 1];
  }
  return result;
}

function drawChart(year, data) {
  const el = document.querySelector(`#registrations-${year} canvas`);
  const diary = new Map(data[year]);
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-09-07`);
  const days = eachDayOfInterval({ start, end });
  const entries = days.map(day => diary.getOrInsert(formatISO(day, { representation: "date" }), [0, 0, 0]));

  entries[0] = data[year].filter(x => x[0] < `${year}-01-01`).reduce(
    (acc, [, [r, i, p]]) => [acc[0] + r, acc[1] + i, acc[2] + p],
    entries[0]
  );
  new Chart(el.getContext("2d"), {
    data: {
      labels: days,
      datasets: [
        { type: "line", label: "Registrovaní", data: cumulative(entries.map(x => x[0])), pointRadius: 0 },
        { type: "line", label: "Vyfakturovaní", data: cumulative(entries.map(x => x[1])), pointRadius: 0 },
        { type: "line", label: "Zaplacení", data: cumulative(entries.map(x => x[2])), pointRadius: 0 }
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
      },
      plugins: {
        htmlLegend: {
          // ID of the container to put the legend in
          containerSelector: `#registrations-${year} .chart-legend`
        },
        legend: {
          display: false
        }
      }
    },
    plugins: [htmlLegendPlugin]
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
    payload: { person: { name: profile.real_name, email: profile.email, id: profile.sub } }
  });

  yearSelector.value = year;
  yearSelector.addEventListener("change", e => {
    location.assign(`?${new URLSearchParams({ year: e.target.value })}`);
  });

  const data = await fetchData({ endpoint: "dashboard" }, new URL("/v2/", apiHost).href);
  const years = Object.fromEntries(data);
  for (const year of Object.keys(years)) {
    drawChart(year, years);
  }
}
