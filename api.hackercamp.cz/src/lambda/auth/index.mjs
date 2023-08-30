import signJWT from "jsonwebtoken/sign.js";
import { getHeader, response, unauthorized, withCORS } from "../http.mjs";
import Rollbar from "../rollbar.mjs";

/** @typedef { import("@pulumi/awsx/classic/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/classic/apigateway").Response } APIGatewayProxyResult */

const rollbar = Rollbar.init({ lambdaName: "auth" });

/**
 * @param {APIGatewayProxyEvent} event
 */
function readBody(event) {
  if (event.isBase64Encoded)
    return Buffer.from(event.body, "base64").toString("utf-8");
  return event.body;
}

function getPayload(event) {
  const payload = readBody(event);
  if (getHeader(event.headers, "Content-Type") === "application/json") {
    return JSON.parse(payload);
  }
  return Object.fromEntries(new URLSearchParams(payload).entries());
}

async function getJWT(code, env, origin) {
  const resp = await fetch("https://slack.com/api/openid.connect.token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env["slack_client_id"],
      client_secret: env["slack_client_secret"],
      redirect_uri: new URL("/", origin).href,
    }),
  });
  const data = await resp.json();
  return { resp, data };
}

async function getUserInfo(token) {
  const resp = await fetch("https://slack.com/api/openid.connect.userInfo", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await resp.json();
  return { resp, data };
}

async function getUsersInfo(user, token) {
  const resp = await fetch("https://slack.com/api/users.info", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: new URLSearchParams({ user }),
  });
  const data = await resp.json();
  return { resp, data };
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function auth(event) {
  const params = getPayload(event);
  const origin =
    getHeader(event.headers, "Origin") ?? `https://${process.env.hostname}`;
  const { resp, data } = await getJWT(params.code, process.env, origin);
  const withCORS_ = withCORS(["POST", "OPTIONS"], origin, {
    allowCredentials: true,
  });
  if (resp.ok && data.ok) {
    const token = data["access_token"];
    const { resp, data: profile } = await getUserInfo(token);
    const {
      data: { user },
    } = await getUsersInfo(profile.sub, token);

    if (resp.ok && profile.ok) {
      console.log({
        event: "Logged in",
        email: profile.email,
        slackID: profile.sub,
      });
      const payload = {
        expiresIn: "6h",
        audience: "https://donut.hackercamp.cz/",
        issuer: "https://api.hackercamp.cz/",
        "https://hackercamp.cz/email": profile.email,
        "https://hackercamp.cz/is_admin": user?.is_admin,
        "https://slack.com/user_id": profile.sub,
        "https://slack.com/access_token": token,
      };
      const idToken = signJWT(payload, process.env["private_key"]);
      delete profile.ok;
      // For local development we need to relax Cross site security
      const sameSite =
        origin.includes("localhost") ||
        origin.includes("7da2-145-224-120-68.ngrok-free.app")
          ? "None"
          : "Strict";
      return withCORS_(
        response(
          {
            ok: true,
            idToken,
            slackToken: data["id_token"],
            slackProfile: Object.assign({}, profile, user),
            slackAccessToken: data["access_token"],
          },
          {
            "Set-Cookie": `hc-id=${idToken}; Max-Age=216000; Domain=hackercamp.cz; Path=/; SameSite=${sameSite}; Secure; HttpOnly`,
          }
        )
      );
    }
    console.error({ token, profile });
  }
  console.error({ code: params.code, data });
  return withCORS_(
    unauthorized({
      "WWW-Authenticate": `Bearer realm="https://donut.hackercamp.cz/", error="invalid_token"`,
    })
  );
}

export const handler = rollbar.lambdaHandler(auth);
