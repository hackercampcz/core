const fs = require("fs");
const esbuild = require("gulp-esbuild");
const mode = require("gulp-mode")();
const DefaultRegistry = require("undertaker-registry");
const projectPath = require("@topmonks/blendid/gulpfile.js/lib/projectPath.js");
const pathConfig = require("./path-config.json");

/** @typedef {import("@types/nunjucks").Environment} Environment */

class ESBuildRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.src = projectPath(pathConfig.src, pathConfig.esbuild.src, "*.js");
    this.dest = projectPath(pathConfig.dest, pathConfig.esbuild.dest);
  }
  init({ task, src, dest }) {
    task("esbuild-prod", () =>
      src(this.src).pipe(esbuild(this.config.options)).pipe(dest(this.dest))
    );
    const esbuildInc = esbuild.createGulpEsbuild({ incremental: true });
    task("esbuild", () =>
      src(this.src).pipe(esbuildInc(this.config.options)).pipe(dest(this.dest))
    );
  }
}

class HackersRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.dest = projectPath(
      pathConfig.src,
      pathConfig.data.src,
      "hackers.json"
    );
  }
  init({ task }) {
    async function getSlackProfiles(token) {
      console.log("Loading Slack profiles...");
      const skip = new Set(["slackbot", "jakub"]);
      const resp = await fetch("https://slack.com/api/users.list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (resp.status !== 200) {
        console.log(data);
      }
      return new Map(
        data.members
          .filter((x) => !(x.is_bot || skip.has(x.name)))
          .map((x) => [x.id, x.profile])
      );
    }

    async function getAttendees() {
      console.log("Loading attendees...");
      const resp = await fetch(
        "https://api.hackercamp.cz/v1/attendees?year=2023"
      );
      return resp.json();
    }

    task("prepare-data", async () => {
      const [profiles, items] = await Promise.all([
        getSlackProfiles(this.config.slackToken),
        getAttendees(),
      ]);
      const attendees = items.map((x) => [x.slug, profiles.get(x.slackID), x]);
      return fs.promises.writeFile(
        this.dest,
        JSON.stringify(attendees, null, 2),
        { encoding: "utf-8" }
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

module.exports = {
  images: true,
  cloudinary: true,
  fonts: true,
  static: true,
  svgSprite: true,
  stylesheets: true,
  javascripts: false,

  html: {
    collections: ["build", "images", "hackers"],
    nunjucksRender: {
      /** @param {Environment} env */
      manageEnv(env) {
        env.addGlobal("currentYear", new Date().getFullYear());
      },
      globals: {
        currentYear: new Date().getFullYear(),
      },
      filters: {
        year() {
          return new Date().getFullYear();
        },
        formatDateTime(s) {
          const date = new Date(s);
          return formatDateTime(date);
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

  browserSync: {
    port: 3000,
    https: true,
    server: {
      baseDir: pathConfig.dest,
    },
    browser: ["Google Chrome Canary"],
  },

  workboxBuild: {
    swSrc: projectPath(pathConfig.src, pathConfig.esbuild.src, "sw.js"),
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
    rev: false,
  },

  registries: [
    new ESBuildRegistry(
      {
        extensions: ["ts", "js", "mjs"],
        options: {
          bundle: true,
          splitting: true,
          treeShaking: true,
          minify: mode.production(),
          mainFields: ["module", "browser", "main"],
          sourcemap: true,
          legalComments: "linked",
          format: "esm",
          platform: "browser",
          target: ["es2021"],
          charset: "utf8",
        },
      },
      pathConfig
    ),
    new HackersRegistry({ slackToken: process.env["SLACK_TOKEN"] }, pathConfig),
  ],

  additionalTasks: {
    development: {
      prebuild: ["prepare-data"],
      code: ["esbuild"],
    },
    production: {
      prebuild: ["prepare-data"],
      code: ["esbuild-prod"],
    },
  },

  watch: {
    tasks: ["esbuild"],
  },
};
