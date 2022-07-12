const esbuild = require("gulp-esbuild");
const mode = require("gulp-mode")();
const projectPath = require("@topmonks/blendid/gulpfile.js/lib/projectPath.js");
const pathConfig = require("./path-config.json");

module.exports = {
  images: true,
  cloudinary: true,
  fonts: true,
  static: true,
  svgSprite: true,
  stylesheets: true,
  javascripts: false,

  html: {
    collections: ["build", "images"],
    nunjucksRender: {
      filters: {
        year: () => new Date().getFullYear(),
      },
    },
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
    development: { code: ["esbuild"] },
    production: { code: ["esbuild-prod"] },
  },

  watch: {
    tasks: ["esbuild"],
  },
};
