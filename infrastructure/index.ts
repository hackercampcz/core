import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import {
  registerAutoTags,
  createCertificate,
  createGoogleMxRecords,
  createTxtRecord,
  Website,
  CloudFront,
  getHostedZone,
} from "@topmonks/pulumi-aws";
import {
  createApi,
  createDB,
  createQueues,
  createRoutes,
} from "@hackercamp/api";
import { AuthEdgeLambda } from "@hackercamp/donut/edge";
import { readTemplates } from "./communication";
import * as postmark from "./postmark";

registerAutoTags({
  "user:Project": pulumi.getProject(),
  "user:Stack": pulumi.getStack(),
});

const config = new pulumi.Config();

const domain = config.get("domain");
const donutDomain = config.get("donut-domain");
const webDomain = config.get("web-domain");
const apiDomain = config.get("api-domain");

createCertificate(donutDomain);
createGoogleMxRecords(domain);
createTxtRecord(
  "google-site-verification",
  domain,
  "google-site-verification=KBiUM11RTkIHm4ZpDtFuUUrEXLSsARgSBVTvQCMA0N0"
);

createGoogleMxRecords("hckr.camp");
createTxtRecord(
  "hckr-google-site-verification",
  "hckr.camp",
  "google-site-verification=DsAlbVX0oPkg6-3STev856iJg08e5u19lKd36cct5is"
);

// TODO: slack-domain-verification=GGg8FlpfnfuznZITUfCuicVigdiJEo9q5nXA3sgM

const hostedZone = getHostedZone(domain);
new aws.route53.Record(`${domain}/txt-records-postmark-dkim`, {
  name: pulumi.interpolate`20220529092104pm._domainkey.${hostedZone.name}`,
  type: "TXT",
  zoneId: pulumi.interpolate`${hostedZone.zoneId}`,
  records: [
    "k=rsa;p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4oUe6QSmHlcBgjSY41LwJGQO/7fh4MD5WXvZMW8hu1H8KKTIfuNgRyV3I6xDPzzHjIMUlAlVClvxGzffC7wQ1qJM6jPFHCTO2o3AkSWfwk2PnT6MsFFFWft9TdAyA6HWO+PtUkuMsujB+JG1uoN19d9CqvMxvjQdNwdGkwwMdmQIDAQAB",
  ],
  ttl: 3600,
});
new aws.route53.Record(`${domain}/cname-record-postmark-bounce`, {
  name: pulumi.interpolate`pm-bounces.${hostedZone.name}`,
  type: "CNAME",
  zoneId: pulumi.interpolate`${hostedZone.zoneId}`,
  records: ["pm.mtasv.net"],
  ttl: 3600,
});
new aws.route53.Record(`${domain}/cname-google-recovery`, {
  name: pulumi.interpolate`google288bf0ca4bf89f6a.${hostedZone.name}`,
  type: "CNAME",
  zoneId: pulumi.interpolate`${hostedZone.zoneId}`,
  records: ["google.com"],
  ttl: 3600,
});

const jwtSecret = new aws.secretsmanager.Secret("hc-jwt-secret", {
  name: "HC-JWT-SECRET",
});

new aws.secretsmanager.SecretVersion("hc-jwt-secret", {
  secretId: jwtSecret.arn,
  secretString: config.get("private-key"),
});

export const postmarkTemplates = {};

for (const args of readTemplates("../communication/")) {
  const template = new postmark.Template(
    `postmark-template-${args.Name}`,
    args
  );
  postmarkTemplates[args.Alias] = template.id;
}

const queues = createQueues();
export const slackQueueUrl = queues.slackQueueUrl;

const db = createDB({ slackQueueUrl });
export const registrationsDataTable = db.registrationsDataTable;
export const contactsDataTable = db.contactsDataTable;
export const optOutsDataTable = db.optOutsDataTable;
export const attendeesDataTable = db.attendeesDataTable;
export const programDataTable = db.programDataTable;

const routes = createRoutes({
  slackQueueUrl,
  registrationsDataTable,
  contactsDataTable,
  optOutsDataTable,
  attendeesDataTable,
  programDataTable,
  postmarkTemplates,
});
const api = createApi("hc-api", "v1", apiDomain, routes.get("v1"));
export const apiUrl = api.url.apply((x) => new URL("/v1/", x).href);

const { lambda: authLambda } = AuthEdgeLambda.create("hc-auth-lambda");
export const websites: Record<string, WebsiteExport> = {
  [donutDomain]: siteExports(
    Website.create(donutDomain, {
      assetsCachePolicyId: CloudFront.ManagedCachePolicy.CachingOptimized,
      assetResponseHeadersPolicyId:
        CloudFront.ManagedResponseHeaderPolicy
          .CORSwithPreflightAndSecurityHeadersPolicy,
      cachePolicyId: CloudFront.ManagedCachePolicy.CachingDisabled,
      responseHeadersPolicyId:
        CloudFront.ManagedResponseHeaderPolicy
          .CORSwithPreflightAndSecurityHeadersPolicy,
      edgeLambdas: [
        "/hackers/",
        "/hackers/*",
        "/registrace/",
        "/ubytovani/",
        "/program/",
        "/admin/",
      ].map((pathPattern) =>
        Object.assign(
          { pathPattern },
          {
            lambdaAssociation: {
              eventType: "viewer-request",
              lambdaArn: authLambda.arn,
            },
          }
        )
      ),
    })
  ),
  [webDomain]: siteExports(Website.create(webDomain, {})),
};

function siteExports(site: Website): WebsiteExport {
  return {
    url: site.url,
    s3BucketUri: site.s3BucketUri,
    s3WebsiteUrl: site.s3WebsiteUrl,
    cloudFrontId: site.cloudFrontId,
  };
}

interface WebsiteExport {
  url: pulumi.Output<string>;
  s3BucketUri: pulumi.Output<string>;
  s3WebsiteUrl: pulumi.Output<string>;
  cloudFrontId: pulumi.Output<string>;
}
