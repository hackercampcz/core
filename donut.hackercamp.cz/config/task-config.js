const esbuild = require("gulp-esbuild");
const mode = require("gulp-mode")();
const projectPath = require("@topmonks/blendid/gulpfile.js/lib/projectPath.js");
const pathConfig = require("./path-config.json");

module.exports = {
  html: true,
  images: true,
  cloudinary: false,
  fonts: true,
  static: true,
  svgSprite: true,
  stylesheets: true,
  javascripts: false,

  esbuild: {
    extensions: ["ts", "js", "mjs"],
    options: {
      bundle: true,
      splitting: true,
      treeShaking: true,
      minify: mode.production(),
      sourcemap: true,
      format: "esm",
      platform: "browser",
      target: ["es2017"],
      charset: "utf8",
    },
  },

  browserSync: {
    server: {
      baseDir: pathConfig.dest
    }
  },

  workboxBuild: {
    globDirectory: pathConfig.dest,
    globPatterns: ["**/*.{html,json,js,css,png,jpg,gif,svg}"],
    // Create service-worker.js source file and define `swSrc` to use `injectManifest` method
    // swSrc: `${pathConfig.src}/sw.js`,
    swDest: `${pathConfig.dest}/sw.prod.js`
  },

  production: {
    rev: true
  },

  additionalTasks: {
    initialize(gulp, pathConfig, taskConfig) {
      const { src, task, dest } = gulp;
      const esmPaths = {
        src: projectPath(pathConfig.src, pathConfig.esbuild.src, "*.mjs"),
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
