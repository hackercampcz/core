import { getToken, validateToken } from "@hackercamp/lib/auth.mjs";

/** @typedef { import("@types/aws-lambda").CloudFrontRequestEvent } CloudFrontRequestEvent */
/** @typedef { import("@types/aws-lambda").CloudFrontRequestResult } CloudFrontRequestResult */

import { SecretsManager } from "@aws-sdk/client-secrets-manager";
const secretsManager = new SecretsManager({ region: "eu-central-1" });
const { SecretString: secret } = await secretsManager.getSecretValue({ SecretId: "HC-JWT-SECRET" });

/**
 * @param {CloudFrontRequestEvent} event
 * @returns {Promise<CloudFrontRequestResult>}
 */
export async function handler(event) {
  const request = event.Records[0].cf.request;
  const token = getToken(request.headers);
  const isValidToken = await validateToken(token, secret);
  console.log("Authorization", request.uri, Boolean(isValidToken));
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
