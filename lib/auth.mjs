import { jwtVerify } from "jose";
import { parse } from "./cookie.mjs";

export async function authorize(role, token, secret) {
  const { payload } = await jwtVerify(token, secret, {});
  switch (role) {
    case "admin":
      return payload["https://hackercamp.cz/is_admin"];
    default:
      return false;
  }
}

export async function validateToken(token, secret) {
  if (token == null) return false;
  try {
    return await jwtVerify(token, secret);
  } catch (err) {
    console.error(err);
    return null;
  }
}

export function getCookies(headers) {
  if (headers?.Cookie) {
    // API Gateway Proxy request
    return parse(headers.Cookie);
  }
  if (headers?.cookie) {
    // Cloudfront request
    return headers.cookie.reduce(
      (reduced, header) => Object.assign(reduced, parse(header.value)),
      {}
    );
  }
  if (headers?.get) {
    // Cloudinary request
    const cookie = headers.get("cookie");
    if (cookie) return parse(cookie);
  }
  return null;
}

function getAuthorization(headers) {
  return (
    headers.authorization?.[0]?.value ??
    headers.Authorization ??
    headers.get("authorization")
  );
}

export function getToken(headers) {
  const cookies = getCookies(headers);
  if (cookies?.["hc-id"]) return cookies["hc-id"];

  const authorization = getAuthorization(headers);
  if (!authorization?.startsWith("Bearer ")) return null;
  const [, token] = authorization.split("Bearer ");
  return token;
}
