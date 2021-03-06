import { getToken, validateToken } from "@hackercamp/lib/auth.mjs";

/** @typedef { import("@types/aws-lambda").CloudFrontRequestEvent } CloudFrontRequestEvent */
/** @typedef { import("@types/aws-lambda").CloudFrontRequestResult } CloudFrontRequestResult */

const AWS = require("aws-sdk");
const secretsManager = new AWS.SecretsManager();
const { SecretString: secret } = await secretsManager
  .getSecretValue({ SecretId: "HC-JWT-SECRET" })
  .promise();

/**
 * @param {CloudFrontRequestEvent} event
 * @returns {Promise<CloudFrontRequestResult>}
 */
export async function handler(event) {
  const request = event.Records[0].cf.request;
  const token = getToken(request.headers);
  const isValidToken = validateToken(token, secret);
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
