const fs = require("fs");
const { fetch } = require("@adobe/helix-fetch");
const esbuild = require("gulp-esbuild");
const mode = require("gulp-mode")();
const projectPath = require("@topmonks/blendid/gulpfile.js/lib/projectPath.js");
const pathConfig = require("./path-config.json");

async function getSlackProfiles(token) {
  console.log("Loading Slack profiles...");
  const skip = new Set(["slackbot", "jakub"]);
  const resp = await fetch("https://slack.com/api/users.list", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  return new Map(
    data.members
      .filter((x) => !(x.is_bot || skip.has(x.name)))
      .map((x) => [x.id, x.profile])
  );
}

async function getAttendees() {
  console.log("Loading attendees...");
  const resp = await fetch("https://api.hackercamp.cz/v1/attendees");
  return resp.json();
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

  esbuild: {
    extensions: ["ts", "js", "mjs"],
    options: {
      bundle: true,
      splitting: true,
      treeShaking: true,
      minify: mode.production(),
      mainFields: ["module", "browser", "main"],
      sourcemap: true,
      format: "esm",
      platform: "browser",
      target: ["es2018"],
      charset: "utf8",
    },
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
    rev: true,
  },

  additionalTasks: {
    initialize(gulp, pathConfig, taskConfig) {
      const { src, task, dest } = gulp;
      const esmPaths = {
        src: projectPath(pathConfig.src, pathConfig.esbuild.src, "*.js"),
        dest: projectPath(pathConfig.dest, pathConfig.esbuild.dest),
      };

      task("prepare-data", async () => {
        const [profiles, items] = await Promise.all([
          getSlackProfiles(process.env["SLACK_TOKEN"]),
          getAttendees(),
        ]);
        const attendees = items.map((x) => [
          x.slug,
          profiles.get(x.slackID),
          x,
        ]);
        return fs.promises.writeFile(
          projectPath(pathConfig.src, pathConfig.data.src, "hackers.json"),
          JSON.stringify(attendees, null, 2),
          { encoding: "utf-8" }
        );
      });

      task("esbuild-prod", () =>
        src(esmPaths.src)
          .pipe(esbuild(taskConfig.esbuild.options))
          .pipe(dest(esmPaths.dest))
      );
      const esbuildInc = esbuild.createGulpEsbuild({ incremental: true });
      task("esbuild", () =>
        src(esmPaths.src)
          .pipe(esbuildInc(taskConfig.esbuild.options))
          .pipe(dest(esmPaths.dest))
      );
    },
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
