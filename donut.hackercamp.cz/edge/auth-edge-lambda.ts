import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { createRole } from "@topmonks/pulumi-aws/lambdas/edge-role";
import * as path from "path";
import * as lambdaBuilder from "../../lambda-builder";

export class AuthEdgeLambda extends pulumi.ComponentResource {
  private lambda: aws.lambda.Function;

  get arn() {
    // Not using qualifiedArn here due to some bugs around sometimes returning $LATEST
    return pulumi.interpolate`${this.lambda.arn}:${this.lambda.version}`;
  }

  constructor(name: string, lambda: aws.lambda.Function) {
    super("hc:AuthEdgeLambda", name);
    this.lambda = lambda;
  }

  static create(name: string) {
    const role = createRole(name);
    new aws.iam.RolePolicyAttachment(`${name}-basic-execution-attachment`, {
      policyArn: aws.iam.ManagedPolicies.AWSLambdaBasicExecutionRole,
      role,
    });
    const policy = new aws.iam.Policy(`${name}-securitymanager-read-policy`, {
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "secretsmanager:GetResourcePolicy",
              "secretsmanager:GetSecretValue",
              "secretsmanager:DescribeSecret",
              "secretsmanager:ListSecretVersionIds",
              "secretsmanager:ListSecrets",
            ],
            Resource: ["*"],
          },
        ],
      }),
    });
    new aws.iam.RolePolicyAttachment(
      `${name}-securitymanager-read-attachment`,
      {
        policyArn: policy.arn,
        role: role,
      }
    );

    const buildAssets = (fileName: string) =>
      lambdaBuilder.buildCodeAsset(
        path.join(__dirname, "lambdas", "auth", fileName),
        true
      );

    // Some resources _must_ be put in us-east-1, such as Lambda at Edge.
    const awsUsEast1 = new aws.Provider(`${name}-us-east-1`, {
      region: "us-east-1",
    });
    const lambda = new aws.lambda.Function(
      `${name}-function`,
      {
        publish: true,
        role: role.arn,
        timeout: 5,
        handler: "index.handler",
        runtime: aws.lambda.Runtime.NodeJS14dX,
        code: buildAssets("index.mjs"),
      },
      { provider: awsUsEast1 }
    );

    return { lambda: new AuthEdgeLambda(name, lambda) };
  }
}
