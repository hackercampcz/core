import Rollbar from "rollbar";

export default {
  /** @param {Rollbar.Configuration} contextConfig */
  init(contextConfig) {
    return new Rollbar({
      accessToken: process.env.rollbar_access_token,
      environment: "production",
      logLevel: "error",
      reportLevel: "error",
      uncaughtErrorLevel: "error",
      autoInstrument: true,
      captureLambdaTimeouts: true,
      captureUncaught: true,
      captureUnhandledRejections: true,
      ...contextConfig,
    });
  },
};
