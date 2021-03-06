import Rollbar from "rollbar/src/browser/core";
import telemeter from "rollbar/src/telemetry";
import instrumenter from "rollbar/src/browser/telemetry";

export function init(env) {
  Rollbar.setComponents({ telemeter, instrumenter });
  Rollbar.init({
    accessToken: env["rollbar/access-token"],
    captureUncaught: true,
    captureUnhandledRejections: true,
    payload: {
      environment: env.environment,
      code_version: env.version,
    },
  });
}
