import pathConfig from "./path-config.json" with { type: "json" };

/** @typedef {import("@types/nunjucks").Environment} Environment */

export default {
  images: true,
  cloudinary: true,
  fonts: true,
  svgSprite: true,
  javascripts: false,
  stylesheets: true,
  workboxBuild: false,

  static: {
    srcConfig: {
      encoding: false,
    },
  },

  generate: {
    redirects: [
      {
        collection: "redirects",
        host: "https://donut.hackercamp.cz",
        route: (x) => x[0],
      },
    ],
  },

  html: {
    dataFile: "global.mjs",
    collections: ["build", "images"],
    nunjucksRender: {
      globals: {
        currentYear: new Date().getFullYear(),
      },
      filters: {
        isoDate(x) {
          return new Date(x).toISOString();
        },
        longDate(x) {
          return new Intl.DateTimeFormat("cs-CZ", {
            day: "numeric",
            month: "long",
          }).format(new Date(x));
        },
        shortDate(x) {
          return new Intl.DateTimeFormat("cs-CZ", {
            day: "numeric",
            month: "numeric",
          }).format(new Date(x));
        },
        price(x, currency) {
          return new Intl.NumberFormat("cs-CZ", {
            style: currency ? "currency" : undefined,
            currency,
            maximumFractionDigits: 0,
          }).format(x).replace(/\u00A0/, "\u202F");
        },
        calendarURL(event) {
          const format = ({ y, m, d }) =>
            `${y}${m.toString().padStart(2, "0")}${
              d
                .toString()
                .padStart(2, "0")
            }`;
          const d = (d) => ({
            y: d.getFullYear(),
            m: d.getMonth() + 1,
            d: d.getDate(),
          });
          const incDay = ({ y, m, d }) => ({ y, m, d: d + 1 });
          return new URL(
            `?${new URLSearchParams({
              action: "TEMPLATE",
              dates: `${format(d(event.startDate))}/${
                format(
                  incDay(d(event.endDate)),
                )
              }`,
              text: event.name,
              location: event.location,
              details: event.details,
              sf: true,
            })}`,
            "https://calendar.google.com/calendar/event",
          ).toString();
        },
      },
    },
  },

  vite: {
    server: { port: 3001 },
    browser: "google chrome canary",
    browserArgs: "--ignore-certificate-errors --allow-insecure-localhost",
  },

  production: {
    rev: {
      exclude: ["favicon.ico", "robots.txt", "humans.txt", "_redirects", "_headers"],
    },
  },
};
