import {verify} from "jsonwebtoken";
import * as jwt from "jsonwebtoken";
import { parse } from "./cookie.mjs";

export function validateToken(token, secret) {
  if (token == null) return false;
  try {
    jwt.verify(token, secret);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export function getToken(headers) {
  if (headers["Cookie"]) {
    // API Gateway Proxy request
    const cookies = parse(headers["Cookie"]);
    if (cookies["hc-id"]) return cookies["hc-id"];
  }
  if (headers["cookie"]) {
    // Cloudfront request
    const cookies = headers["cookie"].reduce(
      (reduced, header) => Object.assign(reduced, parse(header.value)),
      {}
    );
    if (cookies["hc-id"]) return cookies["hc-id"];
  }

  const authorization =
    headers["authorization"]?.[0]?.value ?? headers["Authorization"];
  if (!authorization?.startsWith("Bearer ")) return null;
  const [, token] = authorization.split("Bearer ");
  return token;
}
