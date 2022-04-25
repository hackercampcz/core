import * as jwt from "jsonwebtoken";

/** @typedef { import("@types/aws-lambda").CloudFrontRequestEvent } CloudFrontRequestEvent */
/** @typedef { import("@types/aws-lambda").CloudFrontRequestResult } CloudFrontRequestResult */

const AWS = require("aws-sdk");
const secretsManager = new AWS.SecretsManager();

function isValidToken(authorization) {
  if (!authorization) return false;
  if (!authorization.startsWith("Bearer ")) return false;
  try {
    const [, token] = authorization.split("Bearer ");
    jwt.verify(
      token,
      secretsManager.getSecretValue({ SecretId: "HC-JWT-SECRET" }),
      {
        audience: "https://donut.hackercamp.cz/",
        issuer: "https://api.hackercamp.cz/",
      }
    );
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * @param {CloudFrontRequestEvent} event
 * @returns {Promise<CloudFrontRequestResult>}
 */
export async function handler(event) {
  const request = event.Records[0].cf.request;
  const authorization = request.headers["authorization"][0].value;

  if (!isValidToken(authorization)) {
    return {
      status: "401",
      statusDescription: "Not Authorized",
    };
  }
  return request;
}
