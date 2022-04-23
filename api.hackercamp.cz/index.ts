import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { lambda } from "@pulumi/aws/types/input";
import { LambdaAuthorizer, Method } from "@pulumi/awsx/apigateway";
import { Parameter } from "@pulumi/awsx/apigateway/requestValidator";
import {
  Api,
  ApiRoute,
  CacheSettings,
  CustomDomainDistribution,
} from "@topmonks/pulumi-aws";
import * as path from "path";
import * as lambdaBuilder from "../lambda-builder";

export const routes = new Map<string, Record<string, RouteArgs>>([
  [
    "v1",
    {
      auth: {
        httpMethod: "POST",
        path: "/auth",
        fileName: "auth/index.mjs",
      },
    },
  ],
]);

function hcName(t: string, options?: any) {
  const suffix = options?.stage ? "-" + options?.stage : "";
  return `hc-${t}${suffix}`;
}

export function createApi(
  name: string,
  stage: string,
  domain: string,
  routes: Record<string, RouteArgs>
) {
  const defaultLambdaRole = new aws.iam.Role(
    hcName("default-lambda-role", { stage }),
    {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
        aws.iam.Principals.LambdaPrincipal
      ),
    }
  );

  new aws.iam.RolePolicyAttachment(
    hcName("lambda-basic-execution-attachment", { stage }),
    {
      policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
      role: defaultLambdaRole,
    }
  );

  new aws.iam.RolePolicyAttachment(
    hcName("lambda-dynamo-read-write-attachment", { stage }),
    {
      policyArn: aws.iam.ManagedPolicy.AmazonDynamoDBFullAccess,
      role: defaultLambdaRole,
    }
  );

  new aws.iam.RolePolicyAttachment(
    hcName("lambda-s3-read-attachment", { stage }),
    {
      policyArn: aws.iam.ManagedPolicy.AmazonS3ReadOnlyAccess,
      role: defaultLambdaRole,
    }
  );

  const buildAssets = (fileName: string) =>
    lambdaBuilder.buildCodeAsset(
      path.join(__dirname, "src", "lambda", fileName)
    );

  const getRouteHandler = (
    name: string,
    fileName: string,
    role: aws.iam.Role,
    { environment, timeout = 15, memorySize = 128 }: RouteHandlerArgs
  ): aws.lambda.Function =>
    new aws.lambda.Function(hcName(`api-${name}-lambda`, { stage }), {
      publish: true,
      runtime: aws.lambda.Runtime.NodeJS14dX,
      architectures: ["arm64"],
      role: role.arn,
      handler: "index.handler",
      code: buildAssets(fileName),
      memorySize,
      timeout, // reasonable timeout for initial request without 500
      environment,
    });

  const createHandlerRoute = (
    name: string,
    {
      httpMethod,
      path,
      fileName,
      role,
      requiredParameters,
      cache,
      timeout,
      memorySize,
      authorizers,
      environment,
    }: RouteArgs
  ): ApiRoute => ({
    type: "handler",
    handler: getRouteHandler(name, fileName, role ?? defaultLambdaRole, {
      timeout: timeout ?? 15,
      memorySize,
      environment,
    }),
    cors: { methods: [httpMethod, "OPTIONS"] }, // autogenerate CORS handler
    authorizers,
    requiredParameters,
    httpMethod,
    path,
    cache,
  });

  const api = new Api(name, {
    stageName: stage,
    description: "HackerCamp API",
    cacheEnabled: true,
    cacheSize: "0.5", // GB
    routes: Object.entries(routes).map(([name, route]) =>
      createHandlerRoute(name, route)
    ),
  });

  const customDomainDistribution = new CustomDomainDistribution(name, {
    domainName: domain,
    basePath: stage,
    gateway: api.gateway,
  });

  return { url: customDomainDistribution.url };
}

interface RouteHandlerArgs {
  timeout?: number;
  environment?: lambda.FunctionEnvironment;
  memorySize?: number;
}

interface RouteArgs {
  httpMethod: Method;
  path: string;
  fileName: string;
  role?: aws.iam.Role;
  requiredParameters?: Parameter[];
  cache?: CacheSettings;
  timeout?: number;
  authorizers?: LambdaAuthorizer[] | LambdaAuthorizer;
  environment?: lambda.FunctionEnvironment;
  memorySize?: number;
}
