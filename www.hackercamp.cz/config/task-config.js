const pathConfig = require("./path-config.json");

/** @typedef {import("@types/nunjucks").Environment} Environment */

module.exports = {
  images: true,
  cloudinary: true,
  fonts: true,
  static: true,
  svgSprite: true,
  javascripts: false,
  stylesheets: true,
  workboxBuild: false,

  generate: {
    redirects: [
      {
        collection: "redirects",
        host: "https://donut.hackercamp.cz",
        route: (x) => x,
      },
    ],
  },

  html: {
    collections: ["build", "images"],
    nunjucksRender: {
      /** @param {Environment} env */
      manageEnv(env) {
        env.addGlobal("currentYear", new Date().getFullYear());
      },
      filters: {
        year: () => new Date().getFullYear(),
      },
    },
  },

  browserSync: {
    port: 3001,
    server: {
      baseDir: pathConfig.dest,
    },
  },

  production: {
    rev: true,
  },
};
