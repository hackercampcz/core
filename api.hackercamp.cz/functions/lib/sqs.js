import { SQSClient } from "@aws-sdk/client-sqs";

/**
 * Create credential provider for AWS SDK clients
 *
 * @param {Object} env - Environment variables
 * @param {string} env.AWS_ACCESS_KEY_ID - AWS access key ID
 * @param {string} env.AWS_SECRET_ACCESS_KEY - AWS secret access key
 * @returns {() => {accessKeyId: string, secretAccessKey: string}} Credential provider function
 */
export function credentialProvider(env) {
  return () => ({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY
  });
}

/**
 * Create SQS client with credentials from environment
 *
 * @param {Object} env - Environment variables
 * @param {string} env.AWS_REGION - AWS region
 * @param {string} env.AWS_ACCESS_KEY_ID - AWS access key ID
 * @param {string} env.AWS_SECRET_ACCESS_KEY - AWS secret access key
 * @returns {import("@aws-sdk/client-sqs").SQSClient} SQS client instance
 */
export function createSQSClient(env) {
  return new SQSClient({
    region: env.AWS_REGION,
    credentialDefaultProvider: credentialProvider(env)
  });
}
