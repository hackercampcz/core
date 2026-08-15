import * as aws from "@pulumi/aws";
import {lambda} from "@pulumi/aws/types/input";
import * as pulumi from "@pulumi/pulumi";
import * as path from "node:path";
import * as lambdaBuilder from "./lambda-builder";

const config = new pulumi.Config();
const postmarkConfig = new pulumi.Config("postmark");

const algoliaEnv = {
  algolia_app_id: config.require("algolia-app-id"),
  algolia_admin_key: config.require("algolia-admin-key"),
  algolia_search_key: config.require("algolia-search-key")
};
const rollbar_access_token = config.require("rollbar-access-token");

function hcName(t: string, options?: { stage?: string; }) {
  const suffix = options?.stage ? `-${options.stage}` : "";
  return `hc-${t}${suffix}`;
}

const buildAssets = (fileName: string) =>
  lambdaBuilder.buildCodeAsset(
    path.join(__dirname, "..", "api.hackercamp.cz", "src", "lambda", fileName),
    {
      minify: false,
      format: "esm",
      external: [
        "@aws-sdk/client-dynamodb",
        "@aws-sdk/util-dynamodb",
        "@aws-sdk/client-sqs"
      ]
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
    runtime: aws.lambda.Runtime.NodeJS24dX,
    architectures: ["arm64"],
    role: role.arn,
    handler: "index.handler",
    code: buildAssets(fileName),
    memorySize,
    timeout, // reasonable timeout for initial request without 500
    environment
  });

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

export function createDB({ queues, postmarkTemplates }) {
  const defaultLambdaRole = createDefaultLambdaRole("dynamodb");

  const optOuts = new aws.dynamodb.Table("optouts", {
    name: "optouts",
    hashKey: "email",
    rangeKey: "year",
    attributes: [
      { name: "email", type: "S" },
      { name: "year", type: "N" }
    ],
    billingMode: "PAY_PER_REQUEST"
  });

  const registrations = new aws.dynamodb.Table("registrations", {
    name: "registrations",
    hashKey: "email",
    rangeKey: "year",
    attributes: [
      { name: "email", type: "S" },
      { name: "year", type: "N" },
      { name: "id", type: "S" },
      { name: "invoice_id", type: "N" }
    ],
    billingMode: "PAY_PER_REQUEST",
    streamEnabled: true,
    streamViewType: "NEW_AND_OLD_IMAGES",
    globalSecondaryIndexes: [
      {
        name: "registrations-by-id",
        projectionType: "KEYS_ONLY",
        keySchemas: [{ attributeName: "id", keyType: "HASH" }]
      },
      {
        name: "registrations-by-invoice-id",
        projectionType: "KEYS_ONLY",
        keySchemas: [{ attributeName: "invoice_id", keyType: "HASH" }, { attributeName: "email", keyType: "RANGE" }]
      }
    ]
  });
  registrations.onEvent(
    "paidRegistration",
    getTableEventHandler("paid-registration", "registrations/paid.mjs", defaultLambdaRole, {
      environment: {
        variables: {
          rollbar_access_token,
          slack_queue_url: queues.slackQueueUrl,
          postmark_token: postmarkConfig.get("server-api-token"),
          ...postmarkTemplates
        }
      }
    }),
    { startingPosition: "LATEST" }
  );
  registrations.onEvent(
    "search-indexing-registrations",
    getTableEventHandler("search-indexing-registrations", "registrations/search-index.mjs", defaultLambdaRole, {
      environment: {
        variables: {
          rollbar_access_token,
          slack_bot_token: config.get("slack-bot-token"),
          algolia_index_name: config.get("algolia-registrations-index-name"),
          ...algoliaEnv
        }
      }
    }),
    { startingPosition: "LATEST" }
  );

  const attendees = new aws.dynamodb.Table("attendees", {
    name: "attendees",
    hashKey: "slackID",
    rangeKey: "year",
    attributes: [
      { name: "slackID", type: "S" },
      { name: "year", type: "N" },
      { name: "email", type: "S" }
    ],
    billingMode: "PAY_PER_REQUEST",
    streamEnabled: true,
    streamViewType: "NEW_AND_OLD_IMAGES",
    globalSecondaryIndexes: [{
      name: "attendees-by-email",
      projectionType: "KEYS_ONLY",
      keySchemas: [{ attributeName: "email", keyType: "HASH" }, { attributeName: "year", keyType: "RANGE" }]
    }]
  });
  attendees.onEvent(
    "search-indexing-attendees",
    getTableEventHandler("search-indexing-attendees", "attendees/search-index.mjs", defaultLambdaRole, {
      environment: {
        variables: {
          rollbar_access_token,
          slack_bot_token: config.get("slack-bot-token"),
          algolia_index_name: config.get("algolia-attendees-index-name"),
          ...algoliaEnv
        }
      }
    }),
    { startingPosition: "LATEST" }
  );
  attendees.onEvent(
    "check-in",
    getTableEventHandler("check-in", "attendees/checkin.mjs", defaultLambdaRole, {
      environment: {
        variables: {
          rollbar_access_token,
          nfctron_queue_url: queues.nfcTronQueueUrl
        }
      }
    }),
    { startingPosition: "LATEST" }
  );

  const contacts = new aws.dynamodb.Table("contacts", {
    name: "contacts",
    hashKey: "email",
    rangeKey: "slackID",
    attributes: [
      { name: "email", type: "S" },
      { name: "slackID", type: "S" }
    ],
    billingMode: "PAY_PER_REQUEST",
    streamEnabled: true,
    streamViewType: "NEW_AND_OLD_IMAGES"
  });
  contacts.onEvent(
    "contact-image-changed",
    getTableEventHandler("contact-image-changed", "contacts/image-changed.mjs", defaultLambdaRole, {
      environment: {
        variables: {
          year: config.require("year"),
          rollbar_access_token,
          slack_bot_token: config.require("slack-bot-token"),
          db_table_attendees: attendees.name
        }
      }
    }),
    { startingPosition: "LATEST" }
  );

  const program = new aws.dynamodb.Table("program", {
    name: "program",
    hashKey: "_id",
    rangeKey: "year",
    attributes: [
      { name: "_id", type: "S" },
      { name: "year", type: "N" }
    ],
    billingMode: "PAY_PER_REQUEST"
  });

  const postmark = new aws.dynamodb.Table("postmark", {
    name: "postmark",
    hashKey: "MessageID",
    rangeKey: "RecordType",
    attributes: [
      { name: "MessageID", type: "S" },
      { name: "RecordType", type: "S" }
    ],
    billingMode: "PAY_PER_REQUEST",
    streamEnabled: true,
    streamViewType: "NEW_IMAGE"
  });
  postmark.onEvent(
    "postmark-subscription-change",
    getTableEventHandler("postmark-subscription-change", "postmark/subscription-change.mjs", defaultLambdaRole, {
      environment: {
        variables: {
          db_table_optouts: optOuts.name,
          year: config.require("year")
        }
      }
    }),
    { startingPosition: "LATEST" }
  );

  const trash = new aws.dynamodb.Table("trash", {
    name: "trash",
    hashKey: "email",
    rangeKey: "year",
    attributes: [
      { name: "email", type: "S" },
      { name: "year", type: "N" }
    ],
    billingMode: "PAY_PER_REQUEST"
  });

  return pulumi.Output.create({
    registrationsDataTable: registrations.name,
    contactsDataTable: contacts.name,
    optOutsDataTable: optOuts.name,
    attendeesDataTable: attendees.name,
    programDataTable: program.name,
    postmarkDataTable: postmark.name,
    trashDataTable: trash.name
  });
}

export function createDefaultLambdaRole(stage) {
  const defaultLambdaRole = new aws.iam.Role(
    hcName("default-lambda-role", { stage }),
    {
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(
        aws.iam.Principals.LambdaPrincipal
      )
    }
  );

  new aws.iam.RolePolicyAttachment(
    hcName("lambda-basic-execution-attachment", { stage }),
    {
      policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
      role: defaultLambdaRole
    }
  );

  new aws.iam.RolePolicyAttachment(
    hcName("lambda-dynamo-read-write-attachment", { stage }),
    {
      policyArn: aws.iam.ManagedPolicy.AmazonDynamoDBFullAccess,
      role: defaultLambdaRole
    }
  );

  new aws.iam.RolePolicyAttachment(
    hcName("lambda-s3-read-attachment", { stage }),
    {
      policyArn: aws.iam.ManagedPolicy.AmazonS3ReadOnlyAccess,
      role: defaultLambdaRole
    }
  );

  new aws.iam.RolePolicyAttachment(hcName("lambda-sqs-attachment", { stage }), {
    policyArn: aws.iam.ManagedPolicy.AmazonSQSFullAccess,
    role: defaultLambdaRole
  });
  return defaultLambdaRole;
}

export function createQueues({ postmarkTemplates }) {
  const defaultRole = createDefaultLambdaRole("sqs");
  const slackQueue = new aws.sqs.Queue(hcName("slack-message-queue"), {});
  slackQueue.onEvent(
    "slack-message",
    getSQSHandler("slack", "slack/handler.mjs", defaultRole, {
      environment: {
        variables: {
          rollbar_access_token,
          year: config.getNumber("year"),
          db_table_attendees: "attendees",
          db_table_contacts: "contacts",
          db_table_registrations: "registrations",
          slack_announcement_channel: config.require("slack-announcement-channel"),
          slack_bot_token: config.require("slack-bot-token"),
          postmark_token: postmarkConfig.require("server-api-token"),
          ...postmarkTemplates
        }
      }
    })
  );
  const nfcTronQueue = new aws.sqs.Queue(hcName("nfctron-message-queue"), {});
  nfcTronQueue.onEvent(
    "nfctron-message",
    getSQSHandler("nfctron", "nfctron/handler.mjs", defaultRole, {
      environment: {
        variables: {
          rollbar_access_token,
          db_table_attendees: "attendees"
        }
      }
    })
  );
  return { slackQueueUrl: slackQueue.url, nfcTronQueueUrl: nfcTronQueue.url };
}

interface HandlerArgs {
  timeout?: number;
  environment?: lambda.FunctionEnvironment;
  memorySize?: number;
}
