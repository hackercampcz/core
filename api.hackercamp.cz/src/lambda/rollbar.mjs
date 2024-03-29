import Rollbar from "rollbar";

export default {
  init(contextConfig) {
    return new Rollbar({
      accessToken: process.env.rollbar_access_token,
      environment: "production",
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
