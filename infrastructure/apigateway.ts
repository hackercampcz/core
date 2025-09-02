import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx/classic";
import { LambdaAuthorizer } from "@pulumi/awsx/classic/apigateway/lambdaAuthorizer";
import { Parameter } from "@pulumi/awsx/classic/apigateway/requestValidator";
import * as pulumi from "@pulumi/pulumi";
import { ComponentResource, Config, interpolate, Output, ResourceOptions } from "@pulumi/pulumi";

const awsConfig = new Config("aws");

export class Api extends ComponentResource {
  readonly gateway: awsx.apigateway.API;

  get openApiUrl() {
    const restApiId = this.gateway.restAPI.id;
    const stageName = this.gateway.stage.stageName;
    const region = awsConfig.require("region");
    return interpolate`https://apigateway.${region}.amazonaws.com/restapis/${restApiId}/stages/${stageName}/exports/oas30`;
  }

  constructor(name: string, args: ApiArgs, opts?: ResourceOptions) {
    super("topmonks:aws:apigateway:Api", name, {}, opts);

    this.gateway = new awsx.apigateway.API(
      name,
      {
        stageName: args.stageName,
        routes: createRoutes(name, args.deploymentGroup, args.routes),
        restApiArgs: {
          minimumCompressionSize: "860",
          description: args.description
        },
        stageArgs: {
          cacheClusterEnabled: args.cacheEnabled,
          cacheClusterSize: args.cacheSize
        }
      },
      { parent: this }
    );

    const anySchemaModel = new aws.apigateway.Model(
      name,
      {
        name: name.replace(/-/g, "") + "AnySchema",
        contentType: "application/json",
        restApi: this.gateway.restAPI,
        schema: JSON.stringify({
          type: "object",
          title: "Any Schema"
        })
      },
      { parent: this, dependsOn: [this.gateway.restAPI] }
    );

    createLambdaMethodExecutions(name, this, anySchemaModel, args.routes);
  }
}

export function getHostedZone(domain: string, provider?: aws.Provider) {
  const hostedZone = aws.route53.getZone(
    {
      name: getRootDomain(domain)
    },
    { provider }
  );
  return pulumi.output(hostedZone);
}

/**
 * Gets Wildcard certificate for top domain
 * @param domain {string} website domain name
 * @param provider {aws.Provider}
 * @returns {pulumi.Output<pulumi.Unwrap<aws.acm.GetCertificateResult>>}
 */
export function getCertificate(domain: string, provider?: aws.Provider) {
  const parentDomain = getParentDomain(domain);
  const usEast1 = provider
    ?? new aws.Provider(`${domain}/get-provider/us-east-1`, {
      profile: aws.config.profile,
      region: aws.Region.USEast1
    });
  const certificate = aws.acm.getCertificate(
    { domain: `*.${parentDomain}`, mostRecent: true, statuses: ["ISSUED"] },
    { provider: usEast1, async: true }
  );
  return pulumi.output(certificate);
}

function getParentDomain(domain: string) {
  const { parentDomain } = getDomainAndSubdomain(domain);
  return parentDomain.slice(0, -1);
}

function getRootDomain(domain: string) {
  const { rootDomain } = getDomainAndSubdomain(domain);
  return rootDomain.slice(0, -1);
}

/**
 * Split a domain name into its subdomain and parent domain names.
 * e.g. "www.example.com" => "www", "example.com".
 * @param domain
 * @returns {*}
 */
function getDomainAndSubdomain(domain: string) {
  const parts = domain.split(".");
  if (parts.length < 2) {
    throw new Error(`No TLD found on ${domain}`);
  }
  if (parts.length === 2) {
    return {
      subdomain: "",
      parentDomain: `${domain}.`,
      rootDomain: `${domain}.`
    };
  }

  const subdomain = parts.slice(0, parts.length - 2);
  const parent = parts.slice(1);
  const root = parts.slice(parts.length - 2);
  return {
    subdomain: subdomain.join("."),
    parentDomain: `${parent.join(".")}.`,
    rootDomain: `${root.join(".")}.`
  };
}

export class LambdaMethodExecution extends ComponentResource {
  constructor(name: string, args: LambdaMethodExecutionArgs, opts?: ResourceOptions) {
    super("topmonks:aws:apigateway:LambdaMethodExecution", name, {}, opts);

    const methodResource = getMethodResource(args.gateway, args.path);
    const methodResponse = defineMethodResponse(
      this,
      name,
      args.gateway,
      args.httpMethod,
      args.responseModel,
      methodResource
    );
    defineMethodSettings(this, name, args);
    defineIntegrationResponse(this, name, args.gateway, methodResource, methodResponse);
  }
}

function createLambdaMethodExecutions(
  name: string,
  parent: Api,
  anySchemaModel: aws.apigateway.Model,
  routes: ApiRoute[]
) {
  const corsRoutes: ApiRoute[] = routes
    .filter(x => x.cors)
    .map(({ path, cache, ...rest }) => ({
      ...rest,
      httpMethod: "OPTIONS" as awsx.apigateway.Method,
      responseModel: anySchemaModel,
      path
    }));
  return corsRoutes
    .concat(routes)
    .filter(x => x.type == "named-lambda")
    .map(
      ({ httpMethod, path, responseModel, cache }) =>
        new LambdaMethodExecution(
          `${name}/${httpMethod}${path}`,
          {
            gateway: parent.gateway,
            responseModel: responseModel ?? anySchemaModel,
            httpMethod,
            path,
            cache
          },
          { parent }
        )
    );
}

function createCorsHandler(
  { origin, methods, headers }: CorsSettings = {
    origin: "*",
    methods: "*",
    headers: []
  }
) {
  return async function corsHandler(event: awsx.apigateway.Request): Promise<awsx.apigateway.Response> {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": Array.isArray(methods) ? methods.join(",") : methods,
        "Access-Control-Allow-Headers": [
          "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
          ...headers
        ].join(",")
      },
      body: ""
    };
  };
}

function corsRoute({ path, cors }: ApiRoute): awsx.apigateway.Route {
  return {
    path,
    method: "OPTIONS",
    eventHandler: new aws.lambda.CallbackFunction(`${path.replace(/\//g, "")}-options`, {
      memorySize: 128,
      timeout: 15,
      runtime: aws.lambda.Runtime.NodeJS22dX,
      architectures: ["arm64"],
      callback: createCorsHandler(cors)
    })
  };
}

function createRoutes(
  name: string,
  deploymentGroup: Output<string> | undefined,
  routes: ApiRoute[]
): awsx.apigateway.Route[] {
  const corsRoutes = routes.filter(x => x.cors).map(corsRoute);
  return corsRoutes.concat(
    routes.map(({ httpMethod, path, requiredParameters, authorizers, ...dispatch }) => ({
      path,
      requiredParameters,
      authorizers,
      method: httpMethod,
      eventHandler: dispatch.type === "named-lambda"
        ? aws.lambda.Function.get(
          `${name}/${httpMethod}${path}`,
          interpolate`${deploymentGroup}-${dispatch.lambdaName}`
        )
        : dispatch.handler
    }))
  );
}

function getMethodResource(gateway: awsx.apigateway.API, path: string): Output<aws.apigateway.GetResourceResult> {
  return gateway.restAPI.executionArn.apply(x =>
    gateway.deployment.restApi.apply(_ =>
      aws.apigateway.getResource({
        path,
        restApiId: <string> x.split(":").pop()
      })
    )
  );
}

function defineMethodResponse(
  parent: LambdaMethodExecution,
  name: string,
  gateway: awsx.apigateway.API,
  httpMethod: string,
  responseModel: aws.apigateway.Model,
  methodResource: Output<aws.apigateway.GetResourceResult>
): aws.apigateway.MethodResponse {
  return new aws.apigateway.MethodResponse(
    name,
    {
      restApi: gateway.restAPI,
      resourceId: methodResource.id,
      httpMethod: httpMethod,
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Headers": true,
        "method.response.header.Access-Control-Allow-Methods": true,
        "method.response.header.Access-Control-Allow-Origin": true
      },
      responseModels: { "application/json": responseModel.name }
    },
    { parent, dependsOn: [responseModel, gateway] }
  );
}

function defineMethodSettings(parent: LambdaMethodExecution, name: string, args: LambdaMethodExecutionArgs) {
  new aws.apigateway.MethodSettings(
    name,
    {
      restApi: args.gateway.restAPI,
      stageName: args.gateway.stage.stageName,
      methodPath: interpolate`${args.path}/${args.httpMethod}`,
      settings: {
        cachingEnabled: Boolean(args.cache),
        cacheTtlInSeconds: args.cache?.ttl,
        requireAuthorizationForCacheControl: false,
        cacheDataEncrypted: false,
        unauthorizedCacheControlHeaderStrategy: "SUCCEED_WITH_RESPONSE_HEADER"
      }
    },
    { parent }
  );
}

function defineIntegrationResponse(
  parent: LambdaMethodExecution,
  name: string,
  gateway: awsx.apigateway.API,
  methodResource: Output<aws.apigateway.GetResourceResult>,
  methodResponse: aws.apigateway.MethodResponse
): aws.apigateway.IntegrationResponse {
  return new aws.apigateway.IntegrationResponse(
    name,
    {
      restApi: gateway.restAPI,
      resourceId: methodResource.apply(x => x.id),
      httpMethod: methodResponse.httpMethod,
      statusCode: methodResponse.statusCode,
      responseParameters: {
        "method.response.header.Access-Control-Allow-Headers":
          "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
        "method.response.header.Access-Control-Allow-Methods": "'GET,OPTIONS,POST,PUT'",
        "method.response.header.Access-Control-Allow-Origin": "'*'"
      }
    },
    { parent }
  );
}

export interface CorsSettings {
  origin: string;
  methods: string | string[];
  headers: string[];
}

export interface CacheSettings {
  ttl: number;
}

export interface LambdaMethodExecutionArgs {
  gateway: awsx.apigateway.API;
  httpMethod: awsx.apigateway.Method;
  path: string;
  responseModel: aws.apigateway.Model;
  cors?: CorsSettings;
  cache?: CacheSettings;
}

interface BaseApiRoute {
  httpMethod: awsx.apigateway.Method;
  path: string;
  responseModel?: aws.apigateway.Model;
  cors?: CorsSettings;
  cache?: CacheSettings;
  requiredParameters?: Parameter[];
  authorizers?: LambdaAuthorizer[] | LambdaAuthorizer;
}

interface NamedLambdaApiRoute extends BaseApiRoute {
  type: "named-lambda";
  lambdaName: string;
}

interface HandlerApiRoute extends BaseApiRoute {
  type: "handler";
  handler: aws.lambda.Function;
}

export type ApiRoute = NamedLambdaApiRoute | HandlerApiRoute;

export interface ApiArgs {
  stageName: string;
  routes: ApiRoute[];
  description?: string;
  cacheEnabled?: boolean;
  cacheSize?: string;
  deploymentGroup?: Output<string>;
}
