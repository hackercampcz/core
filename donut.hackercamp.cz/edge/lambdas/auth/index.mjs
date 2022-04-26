import * as jwt from "jsonwebtoken";
import { parse } from "../cookie.mjs";

/** @typedef { import("@types/aws-lambda").CloudFrontRequestEvent } CloudFrontRequestEvent */
/** @typedef { import("@types/aws-lambda").CloudFrontRequestResult } CloudFrontRequestResult */

const AWS = require("aws-sdk");
const secretsManager = new AWS.SecretsManager();

function validate(token) {
  try {
    const secret = secretsManager.getSecretValue({ SecretId: "HC-JWT-SECRET" });
    console.log({ token, secret });
    jwt.verify(token, secret, {
      audience: "https://donut.hackercamp.cz/",
      issuer: "https://api.hackercamp.cz/",
    });
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

function isValidToken(headers) {
  if (headers["cookie"]) {
    const cookies = headers["cookie"].reduce(
      (reduced, header) => Object.assign(reduced, parse(header.value)),
      {}
    );
    console.log({ cookies });
    if (cookies["hc-id"]) return validate(cookies["hc-id"]);
  }

  if (!headers["authorization"]) return false;

  const authorization = headers["authorization"]?.[0]?.value;
  if (!authorization) return false;
  if (!authorization.startsWith("Bearer ")) return false;

  const [, token] = authorization.split("Bearer ");
  return validate(token);
}

/**
 * @param {CloudFrontRequestEvent} event
 * @returns {Promise<CloudFrontRequestResult>}
 */
export async function handler(event) {
  const request = event.Records[0].cf.request;
  if (!isValidToken(request.headers)) {
    return {
      status: "401",
      statusDescription: "Not Authorized",
    };
  }
  return request;
}
