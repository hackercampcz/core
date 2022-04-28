import * as jwt from "jsonwebtoken";

export function validateToken(token, secret) {
  try {
    jwt.verify(token, secret);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}
