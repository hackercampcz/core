import postcssGamutMapping from "@csstools/postcss-gamut-mapping";
import projectPath from "@hckr_/blendid/lib/projectPath.mjs";
import logger from "fancy-log";
import gulpMode from "gulp-mode";
import fs from "node:fs";
import OpenProps from "open-props";
import jitProps from "postcss-jit-props";
import DefaultRegistry from "undertaker-registry";
import data from "../src/data/global.mjs";
import pathConfig from "./path-config.json" assert { type: "json" };

/** @typedef {import("@types/nunjucks").Environment} Environment */

const mode = gulpMode();

class HackersRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.dest = projectPath(
      pathConfig.src,
      pathConfig.data.src,
      "hackers.json",
    );
  }
  init({ task }) {
    async function getSlackProfiles(token) {
      logger.info("Loading Slack profiles…");
      const skip = new Set(["slackbot", "jakub"]);
      const resp = await fetch("https://slack.com/api/users.list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (!resp.ok) {
        logger.warn("Slack profiles:", data.error);
      }
      return new Map(
        data.members
          ?.filter((x) => !(x.is_bot || skip.has(x.name)))
          ?.map((x) => [x.id, x.profile]),
      );
    }

    async function getAttendees(year) {
      logger.info(`Loading ${year} attendees…`);
      const resp = await fetch(`https://api.hackercamp.cz/v1/attendees?year=${year}`);
      return resp.json();
    }

    task("prepare-data", async () => {
      const [profiles, items] = await Promise.all([
        getSlackProfiles(this.config.slackToken),
        getAttendees(this.config.year),
      ]);
      const attendees = items.map((x) => [x.slug, profiles.get(x.slackID), x]);
      return fs.promises.writeFile(
        this.dest,
        JSON.stringify(attendees, null, 2),
        { encoding: "utf-8" },
      );
    });
  }
}

/**
 * @param {Date|null} x
 * @returns {string|null}
 */
const formatDateTime = (x) =>
  x?.toLocaleString("cs", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }) ?? null;

export default {
  images: true,
  cloudinary: true,
  fonts: true,
  svgSprite: true,
  javascripts: false,
  stylesheets: {
    postcss: {
      postcss: {
        plugins: [
          postcssGamutMapping(),
          jitProps(OpenProps),
        ],
      },
    },
  },

  static: {
    srcConfig: {
      encoding: false,
    },
  },

  esbuild: {
    define: { __DEVELOPMENT__: mode.development() ? "true" : "undefined" },
  },

  html: {
    dataFile: "global.mjs",
    collections: ["build", "images", "hackers"],
    nunjucksRender: {
      globals: {
        currentYear: new Date().getFullYear(),
      },
      filters: {
        formatDateTime(s) {
          const date = new Date(s);
          return formatDateTime(date);
        },
        price(x, currency) {
          return new Intl.NumberFormat("cs-CZ", {
            style: currency ? "currency" : undefined,
            currency,
            maximumFractionDigits: 0,
          }).format(x).replace(/\u00A0/, "\u202F");
        },
      },
    },
  },

  generate: {
    html: [
      {
        collection: "hackers",
        template: "shared/hacker.njk",
        route: (x) => `hackers/${x[0]}/index.html`,
      },
    ],
  },

  vite: {
    browser: "google chrome canary",
    browserArgs: "--ignore-certificate-errors --allow-insecure-localhost",
  },

  workboxBuild: {
    swSrc: projectPath(pathConfig.src, pathConfig.esm.src, "sw.js"),
    swDest: projectPath(pathConfig.dest, "sw.js"),
    globDirectory: pathConfig.dest,
    globPatterns: ["**/*.html", "assets/**/*.{js,mjs,css}"],
    globIgnores: [
      "hackers/**/*.html",
      "admin/**/*.html",
      "ubytovani/**/*.html",
      "program/**/*.html",
      "registrace/**/*.html",
    ],
  },

  production: {
    rev: true,
  },

  registries: [
    new HackersRegistry(
      { slackToken: process.env["SLACK_TOKEN"], year: data.year },
      pathConfig,
    ),
  ],

  additionalTasks: {
    development: {
      prebuild: ["prepare-data"],
    },
    production: {
      prebuild: ["prepare-data"],
    },
  },
};
