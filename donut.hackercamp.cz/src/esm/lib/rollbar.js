import Rollbar from "rollbar/src/browser/core";
import instrumenter from "rollbar/src/browser/telemetry";
import telemeter from "rollbar/src/telemetry";

export function init(env) {
  Rollbar.setComponents({ telemeter, instrumenter });
  return Rollbar.init({
    accessToken: env["rollbar/access-token"],
    addErrorContext: true,
    captureIp: "anonymize",
    captureUncaught: true,
    captureUnhandledRejections: true,
    payload: { environment: env.environment, code_version: env.version }
  });
}

export function info(...args) {
  Rollbar.info(...args);
}

export function error(...args) {
  Rollbar.error(...args);
}
