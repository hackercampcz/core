import { createCookie } from "@hackercamp/lib/auth.js";
import { signJWT } from "../../lib/auth.js";

async function getJWT(code, env, origin) {
  const resp = await fetch("https://slack.com/api/openid.connect.token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.slack_client_id,
      client_secret: env.slack_client_secret,
      redirect_uri: new URL("/", origin).href
    })
  });
  const data = await resp.json();
  return { resp, data };
}

async function getUserInfo(token) {
  const resp = await fetch("https://slack.com/api/openid.connect.userInfo", {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
  });
  const data = await resp.json();
  return { resp, data };
}

async function getUsersInfo(user, token) {
  const resp = await fetch("https://slack.com/api/users.info", {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    body: new URLSearchParams({ user })
  });
  const data = await resp.json();
  return { resp, data };
}

function getPayload(request) {
  const contentType = request.headers.get("Content-Type");
  if (contentType === "application/json") {
    return request.json();
  }
  return request.formData().then(formData => Object.fromEntries(formData.entries()));
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin") ?? `https://${env.HC_DONUT_HOSTNAME}`;
  const params = await getPayload(request);
  const { resp, data } = await getJWT(params.code, env, origin);

  if (resp.ok && data.ok) {
    const token = data.access_token;
    const { resp: userInfoResp, data: profile } = await getUserInfo(token);
    const { data: { user } } = await getUsersInfo(profile.sub, token);

    if (userInfoResp.ok && profile.ok) {
      console.log({ event: "Logged in", email: profile.email, slackID: profile.sub });
      const payload = {
        "https://hackercamp.cz/email": profile.email,
        "https://hackercamp.cz/is_admin": user?.is_admin,
        "https://slack.com/user_id": profile.sub,
        "https://slack.com/access_token": token
      };
      const idToken = await signJWT(payload, env.private_key);
      delete profile.ok;

      // For local development we need to relax Cross site security
      const sameSite = origin.includes("localhost") ? "none" : "strict";
      const cookieValue = createCookie(idToken, {
        domain: "hackercamp.cz",
        path: "/",
        sameSite,
        secure: true,
        httpOnly: true,
        maxAge: 1_209_600
      });

      return Response.json({
        ok: true,
        idToken,
        slackToken: data.id_token,
        slackProfile: Object.assign({}, profile, user),
        slackAccessToken: data.access_token
      }, {
        headers: {
          "Set-Cookie": cookieValue,
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Credentials": "true"
        }
      });
    }
    console.error({ token, profile });
  }

  console.error({ code: params.code, data });
  return new Response(null, {
    status: 401,
    headers: {
      "WWW-Authenticate": "Bearer realm=\"https://donut.hackercamp.cz/\", error=\"invalid_token\"",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true"
    }
  });
}
