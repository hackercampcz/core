const createSharedTaskConfig = require("../../shared/config/createSharedTaskConfig");
const pathConfig = require("./path-config.json");

const config = createSharedTaskConfig(__dirname, {
  images: true,
  cloudinary: true,
  fonts: true,
  static: true,
  svgSprite: true,
  javascripts: false,
  stylesheets: true,
  workboxBuild: false,

  html: {
    collections: ["images"],
    nunjucksRender: {
      filters: {
        year() {
          return new Date().getFullYear();
        }
      }
    }
  },

  browserSync: {
    server: {
      baseDir: pathConfig.dest
    }
  },

  production: {
    rev: true
  }
});

module.exports = config;
