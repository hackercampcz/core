import { validateToken } from "@hackercamp/lib/auth.mjs";
import { parse } from "@hackercamp/lib/cookie.mjs";

/** @typedef { import("@types/aws-lambda").CloudFrontRequestEvent } CloudFrontRequestEvent */
/** @typedef { import("@types/aws-lambda").CloudFrontRequestResult } CloudFrontRequestResult */

const AWS = require("aws-sdk");
const secretsManager = new AWS.SecretsManager();
const { SecretString: secret } = await secretsManager
  .getSecretValue({ SecretId: "HC-JWT-SECRET" })
  .promise();

function validate(headers, secret) {
  if (headers["cookie"]) {
    const cookies = headers["cookie"].reduce(
      (reduced, header) => Object.assign(reduced, parse(header.value)),
      {}
    );
    if (cookies["hc-id"]) return validateToken(cookies["hc-id"], secret);
  }

  if (!headers["authorization"]) return false;

  const authorization = headers["authorization"]?.[0]?.value;
  if (!authorization) return false;
  if (!authorization.startsWith("Bearer ")) return false;

  const [, token] = authorization.split("Bearer ");
  return validateToken(token, secret);
}

/**
 * @param {CloudFrontRequestEvent} event
 * @returns {Promise<CloudFrontRequestResult>}
 */
export async function handler(event) {
  const request = event.Records[0].cf.request;
  const isValidToken = validate(request.headers, secret);
  if (isValidToken) return request;
  return {
    status: "307",
    statusDescription: "Temporary Redirect",
    headers: {
      location: [
        {
          key: "location",
          value: `https://donut.hackercamp.cz/?${new URLSearchParams({
            state: "not-authenticated",
            returnUrl: request.uri,
          })}`,
        },
      ],
    },
  };
}
