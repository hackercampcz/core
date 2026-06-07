/** @typedef {import("@types/nunjucks").Environment} Environment */

/**
 * @param {Record<string, *>} pathConfig
 * @param {{development: () => boolean, production: () => boolean}} mode
 * @param {Boolean} verbose
 * @return {TaskConfig}
 */
export default function (pathConfig, mode, verbose) {
  return {
    images: false,
    cloudflare: true,
    cloudinary: true,
    fonts: true,
    svgSprite: true,
    static: true,
    esbuild: true,
    stylesheets: true,

    html: {
      data: {collections: ["build", "images"]},
      nunjucksRender: {
        filters: {
          isoDate(x) {
            return Temporal.ZonedDateTime.from(x).toString({timeZoneName: "never"});
          },
          longDate(x) {
            return new Intl.DateTimeFormat("cs-CZ", {day: "numeric", month: "long"}).format(Temporal.PlainDate.from(x));
          },
          shortDate(x) {
            return new Intl.DateTimeFormat("cs-CZ", {
              day: "numeric",
              month: "numeric"
            }).format(Temporal.PlainDate.from(x));
          },
          year(x) {
            return new Intl.DateTimeFormat("cs-CZ", {year: "numeric"}).format(Temporal.PlainDate.from(x));
          },
          price(x, currency) {
            return new Intl.NumberFormat("cs-CZ", {
              style: currency ? "currency" : undefined,
              currency,
              maximumFractionDigits: 0
            }).format(x).replace(/\u00A0/, "\u202F");
          },
          calendarURL(event) {
            const format = ({y, m, d}) => `${y}${m.toString().padStart(2, "0")}${d.toString().padStart(2, "0")}`;
            const d = d => ({y: d.year, m: d.month, d: d.day});
            const incDay = ({y, m, d}) => ({y, m, d: d + 1});
            return new URL(
              `?${new URLSearchParams({
                action: "TEMPLATE",
                dates: `${format(d(event.startDate))}/${format(incDay(d(event.endDate)))}`,
                text: event.name,
                location: event.location,
                details: event.details,
                sf: true
              })}`,
              "https://calendar.google.com/calendar/event"
            ).toString();
          }
        }
      }
    },

    vite: {
      server: {port: 3001},
      browser: "firefox developer edition"
    },

    production: {
      rev: {
        exclude: ["_headers", "_redirects"]
      }
    }
  };
}
