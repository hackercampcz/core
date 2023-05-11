import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { getToken, validateToken } from "@hackercamp/lib/auth.mjs";

/** @typedef { import("@types/aws-lambda").CloudFrontRequestEvent } CloudFrontRequestEvent */
/** @typedef { import("@types/aws-lambda").CloudFrontRequestResult } CloudFrontRequestResult */

const secretsManager = new SecretsManagerClient({ region: "eu-central-1" });
const getJWTSecret = new GetSecretValueCommand({ SecretId: "HC-JWT-SECRET" });
const { SecretString: secret } = await secretsManager.send(getJWTSecret);

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

  const query = new URLSearchParams({
    state: "not-authenticated",
    returnUrl: request.querystring
      ? `${request.uri}?${request.querystring}`
      : request.uri,
  });
  return {
    status: "307",
    statusDescription: "Temporary Redirect",
    headers: {
      location: [
        {
          key: "location",
          value: `https://donut.hackercamp.cz/?${query}`,
        },
      ],
    },
  };
}
