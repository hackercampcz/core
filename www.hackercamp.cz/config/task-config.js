const pathConfig = require("./path-config.json");

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
    collections: ["images", "build"],
    nunjucksRender: {
      filters: {
        year() {
          return new Date().getFullYear();
        },
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
