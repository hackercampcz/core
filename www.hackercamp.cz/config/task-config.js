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
    server: {
      baseDir: pathConfig.dest,
    },
  },

  production: {
    rev: true,
  },
};
