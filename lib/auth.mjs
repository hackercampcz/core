import * as jwt from "jsonwebtoken";
import { parse } from "./cookie.mjs";

function verify(token, secret, options = null) {
  return new Promise((resolve, reject) =>
    jwt.verify(token, secret, options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    })
  );
}

export async function authorize(role, token, secret) {
  const result = await verify(token, secret, {});
  switch (role) {
    case "admin":
      return result["https://hackercamp.cz/is_admin"];
    default:
      return false;
  }
}

export async function validateToken(token, secret) {
  if (token == null) return false;
  try {
    return await verify(token, secret);
  } catch (err) {
    console.error(err);
    return null;
  }
}

export function getToken(headers) {
  if (headers.Cookie) {
    // API Gateway Proxy request
    const cookies = parse(headers.Cookie);
    if (cookies["hc-id"]) return cookies["hc-id"];
  }
  if (headers.cookie) {
    // Cloudfront request
    const cookies = headers.cookie.reduce(
      (reduced, header) => Object.assign(reduced, parse(header.value)),
      {}
    );
    if (cookies["hc-id"]) return cookies["hc-id"];
  }

  const authorization =
    headers.authorization?.[0]?.value ?? headers.Authorization;
  if (!authorization?.startsWith("Bearer ")) return null;
  const [, token] = authorization.split("Bearer ");
  return token;
}
