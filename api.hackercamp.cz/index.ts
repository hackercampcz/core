import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { lambda } from "@pulumi/aws/types/input";
import { LambdaAuthorizer, Method } from "@pulumi/awsx/classic/apigateway";
import { Parameter } from "@pulumi/awsx/classic/apigateway/requestValidator";
import {
  Api,
  ApiRoute,
  CacheSettings,
  CustomDomainDistribution,
} from "@topmonks/pulumi-aws";
import * as path from "path";
import * as lambdaBuilder from "@hackercamp/infrastructure/lambda-builder";

const config = new pulumi.Config();

const algoliaEnv = {
  algolia_app_id: config.get("algolia-app-id"),
  algolia_admin_key: config.get("algolia-admin-key"),
  algolia_search_key: config.get("algolia-search-key"),
  // TODO: extend this to support more than one index
  algolia_index_name: config.get("algolia-index-name"),
};
const rollbar_access_token = config.require("rollbar-access-token");

export const createRoutes = ({
  slackQueueUrl,
  // TODO: inject table names to lambdas
  registrationsDataTable,
  contactsDataTable,
  optOutsDataTable,
  attendeesDataTable,
  programDataTable,
  postmarkTemplates,
}: Record<string, any>) =>
  new Map<string, Record<string, RouteArgs>>([
    [
      "v1",
      {
        attendees: {
          httpMethod: "ANY",
          path: "/attendees",
          fileName: "attendees/index.mjs",
          environment: {
            variables: {
              rollbar_access_token,
              db_table_attendees: attendeesDataTable,
              postmark_token: config.get("postmark-token"),
              ...postmarkTemplates,
            },
          },
        },
        auth: {
          httpMethod: "POST",
          path: "/auth",
          fileName: "auth/index.mjs",
          environment: {
            variables: {
              rollbar_access_token,
              hostname: config.get("donut-domain"),
              private_key: config.get("private-key"),
              slack_client_id: config.get("slack-client-id"),
              slack_client_secret: config.get("slack-client-secret"),
              postmark_token: config.get("postmark-token"),
              ...postmarkTemplates,
            },
          },
        },
        authSignOut: {
          httpMethod: "GET",
          path: "/auth/sign-out",
          fileName: "auth/sign-out.mjs",
          environment: {
            variables: {
              rollbar_access_token,
              hostname: config.get("donut-domain"),
              postmark_token: config.get("postmark-token"),
              ...postmarkTemplates,
            },
          },
        },
        contacts: {
          httpMethod: "GET",
          path: "/contacts",
          fileName: "contacts/index.mjs",
          environment: {
            variables: {
              rollbar_access_token,
              db_table_contacts: contactsDataTable,
              hostname: config.get("web-domain"),
              donut: config.get("donut-domain"),
              private_key: config.get("private-key"),
              postmark_token: config.get("postmark-token"),
              ...postmarkTemplates,
            },
          },
        },
        registration: {
          httpMethod: "ANY",
          path: "/registration",
          fileName: "registration/index.mjs",
          environment: {
            variables: {
              rollbar_access_token,
              hostname: config.get("web-domain"),
              donut: config.get("donut-domain"),
              private_key: config.get("private-key"),
              postmark_token: config.get("postmark-token"),
              ...postmarkTemplates,
            },
          },
        },
        housing: {
          httpMethod: "ANY",
          path: "/housing",
          fileName: "housing/index.mjs",
          environment: {
            variables: {
              rollbar_access_token,
              private_key: config.get("private-key"),
              slack_bot_token: config.get("slack-bot-token"),
              postmark_token: config.get("postmark-token"),
              ...postmarkTemplates,
            },
          },
        },
        program: {
          httpMethod: "ANY",
          path: "/program",
          fileName: "program/index.mjs",
          environment: {
            variables: {
              rollbar_access_token,
              db_table_attendees: attendeesDataTable,
              db_table_program: programDataTable,
              private_key: config.get("private-key"),
              slack_bot_token: config.get("slack-bot-token"),
              postmark_token: config.get("postmark-token"),
              ...postmarkTemplates,
            },
          },
        },
        optout: {
          httpMethod: "POST",
          path: "/optout",
          fileName: "optout/index.mjs",
          environment: {
            variables: {
              rollbar_access_token,
            },
          },
        },
        adminRegistrations: {
          httpMethod: "ANY",
          path: "/admin/registrations",
          fileName: "admin/registrations/index.mjs",
          environment: {
            variables: {
              rollbar_access_token,
              db_table_optouts: optOutsDataTable,
              db_table_registrations: registrationsDataTable,
              private_key: config.get("private-key"),
              fakturoid_token: config.get("fakturoid-token"),
              postmark_token: config.get("postmark-token"),
              ...algoliaEnv,
              ...postmarkTemplates,
            },
          },
        },
        adminAttendees: {
          httpMethod: "ANY",
          path: "/admin/attendees",
          fileName: "admin/attendees/index.mjs",
          environment: {
            variables: {
              rollbar_access_token,
              db_table_attendees: attendeesDataTable,
              private_key: config.get("private-key"),
              postmark_token: config.get("postmark-token"),
              ...postmarkTemplates,
            },
          },
        },
        adminHousing: {
          httpMethod: "ANY",
          path: "/admin/housing",
          fileName: "admin/housing/index.mjs",
          environment: {
            variables: {
              rollbar_access_token,
              db_table_attendees: attendeesDataTable,
              private_key: config.get("private-key"),
              postmark_token: config.get("postmark-token"),
              ...postmarkTemplates,
            },
          },
        },
        adminProgram: {
          httpMethod: "ANY",
          path: "/admin/program",
          fileName: "admin/program/index.mjs",
          environment: {
            variables: {
              rollbar_access_token,
              db_table_attendees: attendeesDataTable,
              db_table_program: programDataTable,
              private_key: config.get("private-key"),
              postmark_token: config.get("postmark-token"),
              ...postmarkTemplates,
            },
          },
        },
        ares: {
          httpMethod: "GET",
          path: "/ares",
          fileName: "ares/index.mjs",
          requiredParameters: [{ in: "query", name: "ico" }],
          cache: { ttl: 3600 },
          memorySize: 512,
          environment: {
            variables: {
              rollbar_access_token,
            },
          },
        },
        fakturoidWebhook: {
          httpMethod: "POST",
          path: "/webhooks/fakturoid",
          fileName: "fakturoid/webhook.mjs",
          environment: {
            variables: {
              rollbar_access_token,
              TOKEN: config.get("fakturoid-webhook-token"),
              postmark_token: config.get("postmark-token"),
              ...postmarkTemplates,
            },
          },
        },
        slackWebhook: {
          httpMethod: "POST",
          path: "/webhooks/slack",
          fileName: "slack/webhook.mjs",
          environment: {
            variables: {
              year: config.getNumber("year"),
              rollbar_access_token,
              slack_queue_url: slackQueueUrl,
              slack_bot_token: config.get("slack-bot-token"),
              postmark_token: config.get("postmark-token"),
              ...postmarkTemplates,
            },
          },
        },
      },
    ],
  ]);

function hcName(t: string, options?: { stage?: string }) {
  const suffix = options?.stage ? `-${options.stage}` : "";
  return `hc-${t}${suffix}`;
}

const buildAssets = (fileName: string) =>
  lambdaBuilder.buildCodeAsset(
    path.join(__dirname, "src", "lambda", fileName),
    {
      minify: false,
      format: "esm",
      external: [
        "@aws-sdk/client-dynamodb",
        "@aws-sdk/util-dynamodb",
        "@aws-sdk/client-sqs",
      ],
    }
  );

const getHandler = (
  name: string,
  fileName: string,
  role: aws.iam.Role,
  { environment, timeout = 15, memorySize = 128 }: HandlerArgs
): aws.lambda.Function =>
  new aws.lambda.Function(name, {
    publish: true,
    runtime: aws.lambda.Runtime.NodeJS18dX,
    architectures: ["arm64"],
    role: role.arn,
    handler: "index.handler",
    code: buildAssets(fileName),
    memorySize,
    timeout, // reasonable timeout for initial request without 500
    environment,
  });

const getRouteHandler = (
  name: string,
  fileName: string,
  role: aws.iam.Role,
  { stage, ...args }: RouteHandlerArgs
): aws.lambda.Function =>
  getHandler(hcName(`api-${name}-lambda`, { stage }), fileName, role, args);

const getTableEventHandler = (
  name: string,
  fileName: string,
  role: aws.iam.Role,
  args: HandlerArgs
): aws.lambda.Function =>
  getHandler(
    hcName(`dynamodb-${name}-lambda`),
    path.join("dynamodb", fileName),
    role,
    args
  );

const getSQSHandler = (
  name: string,
  fileName: string,
  role: aws.iam.Role,
  args: HandlerArgs
): aws.lambda.Function =>
  getHandler(
    hcName(`sqs-${name}-lambda`),
    path.join("sqs", fileName),
    role,
    args
  );

export function createDB({ slackQueueUrl, postmarkTemplates }) {
  const defaultLambdaRole = createDefaultLambdaRole("dynamodb");

  const optOuts = new aws.dynamodb.Table(hcName("optouts"), {
    name: hcName("optouts"),
    hashKey: "email",
    rangeKey: "year",
    attributes: [
      { name: "email", type: "S" },
      { name: "year", type: "N" },
    ],
    billingMode: "PAY_PER_REQUEST",
  });

  const registrations = new aws.dynamodb.Table(hcName("registrations"), {
    name: hcName("registrations"),
    hashKey: "email",
    rangeKey: "year",
    attributes: [
      { name: "email", type: "S" },
      { name: "year", type: "N" },
    ],
    billingMode: "PAY_PER_REQUEST",
    streamEnabled: true,
    streamViewType: "NEW_AND_OLD_IMAGES",
  });
  registrations.onEvent(
    "paidRegistration",
    getTableEventHandler(
      "paid-registration",
      "registrations/paid.mjs",
      defaultLambdaRole,
      {
        environment: {
          variables: {
            rollbar_access_token,
            slack_queue_url: slackQueueUrl,
            postmark_token: config.get("postmark-token"),
            ...postmarkTemplates,
          },
        },
      }
    ),
    { startingPosition: "LATEST" }
  );
  registrations.onEvent(
    "search-indexing",
    getTableEventHandler(
      "search-indexing",
      "registrations/search-index.mjs",
      defaultLambdaRole,
      {
        environment: {
          variables: {
            rollbar_access_token,
            slack_bot_token: config.get("slack-bot-token"),
            ...algoliaEnv,
          },
        },
      }
    ),
    { startingPosition: "LATEST" }
  );

  const contacts = new aws.dynamodb.Table(hcName("contacts"), {
    name: hcName("contacts"),
    hashKey: "email",
    rangeKey: "slackID",
    attributes: [
      { name: "email", type: "S" },
      { name: "slackID", type: "S" },
    ],
    billingMode: "PAY_PER_REQUEST",
  });

  const attendees = new aws.dynamodb.Table(hcName("attendees"), {
    name: hcName("attendees"),
    hashKey: "slackID",
    rangeKey: "year",
    attributes: [
      { name: "slackID", type: "S" },
      { name: "year", type: "N" },
    ],
    billingMode: "PAY_PER_REQUEST",
  });

  const program = new aws.dynamodb.Table(hcName("program"), {
    name: hcName("program"),
    hashKey: "_id",
    rangeKey: "year",
    attributes: [
      { name: "_id", type: "S" },
      { name: "year", type: "N" },
    ],
    billingMode: "PAY_PER_REQUEST",
  });

  return pulumi.Output.create({
    registrationsDataTable: registrations.name,
    contactsDataTable: contacts.name,
    optOutsDataTable: optOuts.name,
    attendeesDataTable: attendees.name,
    programDataTable: program.name,
  });
}

export function createDefaultLambdaRole(stage) {
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

  new aws.iam.RolePolicyAttachment(hcName("lambda-sqs-attachment", { stage }), {
    policyArn: aws.iam.ManagedPolicy.AmazonSQSFullAccess,
    role: defaultLambdaRole,
  });
  return defaultLambdaRole;
}

export function createQueues() {
  const defaultRole = createDefaultLambdaRole("sqs");
  const slackQueue = new aws.sqs.Queue(hcName("slack-message-queue"), {});
  slackQueue.onEvent(
    "slack-message",
    getSQSHandler("slack", "slack/handler.mjs", defaultRole, {
      environment: {
        variables: {
          rollbar_access_token,
          slack_announcement_url: config.get("slack-incoming-webhook"),
        },
      },
    })
  );
  return { slackQueueUrl: slackQueue.url };
}

export function createApi(
  name: string,
  stage: string,
  domain: string,
  routes: Record<string, RouteArgs>
) {
  const defaultLambdaRole = createDefaultLambdaRole(stage);
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
      stage,
    }),
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

  const customDomainDistribution = new CustomDomainDistribution(
    name,
    {
      domainName: domain,
      basePath: stage,
      gateway: api.gateway,
    },
    { dependsOn: [api] }
  );

  return { url: customDomainDistribution.url };
}

interface HandlerArgs {
  timeout?: number;
  environment?: lambda.FunctionEnvironment;
  memorySize?: number;
}

interface RouteHandlerArgs extends HandlerArgs {
  stage?: string;
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
