import {parseCookie, stringifySetCookie} from "cookie";
import {SignJWT} from "jose/jwt/sign";
import {jwtVerify} from "jose/jwt/verify";

/** @typedef {import("cookie")} SerializeOptions */

const COOKIE_NAME = "hc-id";
const options = {
  issuer: "https://api.hackercamp.cz/",
  audience: "https://donut.hackercamp.cz/",
  expiresIn: "14 days"
};

export function signJWT(payload, privateKey) {
  const secret = new TextEncoder().encode(privateKey);
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(options.issuer)
    .setAudience(options.audience)
    .setExpirationTime(options.expiresIn);
  return jwt.sign(secret);
}

async function verify(secret, token) {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, {
    issuer: options.issuer,
    audience: options.audience
  });
  return payload;
}

export async function validateToken(token, secret) {
  if (token == null) return false;
  try {
    return await verify(secret, token);
  } catch (err) {
    console.error(err);
    return null;
  }
}

export function getCookies(headers) {
  const cookie = headers.get("cookie");
  if (cookie) return parseCookie(cookie);
  return null;
}

function getAuthorization(headers) {
  return headers.get("authorization");
}

export function getToken(headers) {
  const cookies = getCookies(headers);
  if (cookies?.[COOKIE_NAME]) return cookies[COOKIE_NAME];

  const authorization = getAuthorization(headers);
  if (!authorization?.startsWith("Bearer ")) return null;
  const [, token] = authorization.split("Bearer ");
  return token;
}

/**
 * @param {string} idToken
 * @param {SerializeOptions} options
 * @return {string}
 */
export function createCookie(idToken, options) {
  return stringifySetCookie(Object.assign({ name: COOKIE_NAME, value: idToken }, options));
}

export async function authorize(role, token, secret) {
  const payload = await verify(secret, token);
  switch (role) {
    case "admin":
      return payload["https://hackercamp.cz/is_admin"];
    default:
      return false;
  }
}
