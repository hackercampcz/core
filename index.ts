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
  createCacheBoostingPolicy,
  createSecurityHeadersAndPermissionsPolicy,
} from "@topmonks/pulumi-aws";
import { createApi, createDB, routes } from "./api.hackercamp.cz";
import { AuthEdgeLambda } from "./donut.hackercamp.cz/edge";

registerAutoTags({
  "user:Project": pulumi.getProject(),
  "user:Stack": pulumi.getStack(),
});

const config = new pulumi.Config();

const domain = config.get("domain") as string;
const donutDomain = config.get("donut-domain") as string;
const webDomain = config.get("web-domain") as string;
const apiDomain = config.get("api-domain") as string;

createCertificate(donutDomain);
createGoogleMxRecords(domain);
createTxtRecord(
  "google-site-verification",
  domain,
  "google-site-verification=eIaBVqhznPV-0AAEEbFJN82j3w063w_tW0-DUZWX5C0"
);

createGoogleMxRecords("hckr.camp");
createTxtRecord(
  "hckr-google-site-verification",
  "hckr.camp",
  "google-site-verification=ZPwDOXETfpTUVRkNge-bejcAHnlXhlm14LSpOWsOZsA"
);

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

const hackersOai = new aws.cloudfront.OriginAccessIdentity(
  "hc-hacker-profiles",
  {
    comment: "Hackers profiles access identity",
  }
);

const jwtSecret = new aws.secretsmanager.Secret("hc-jwt-secret", {
  name: "HC-JWT-SECRET",
});

new aws.secretsmanager.SecretVersion("hc-jwt-secret", {
  secretId: jwtSecret.arn,
  secretString: config.get("private-key"),
});

const hackerProfilesBucket = new aws.s3.Bucket("hc-hacker-profiles", {
  acl: "private",
  bucketPrefix: "hc-hacker-profiles",
  forceDestroy: true,
});

const hackersPolicyDocument = aws.iam.getPolicyDocumentOutput({
  statements: [
    {
      principals: [
        {
          type: "AWS",
          identifiers: [hackersOai.iamArn],
        },
      ],
      actions: ["s3:GetObject"],
      resources: [pulumi.interpolate`${hackerProfilesBucket.arn}/*`],
    },
  ],
});

new aws.s3.BucketPolicy("hc-hacker-profiles", {
  bucket: hackerProfilesBucket.id,
  policy: hackersPolicyDocument.apply((x) => x.json),
});

const db = createDB();
export const registrationsDataTable = db.registrationsDataTable;
export const contactsDataTable = db.contactsDataTable;

const api = createApi("hc-api", "v1", apiDomain, routes.get("v1"));
export const apiUrl = api.url.apply((x) => new URL("/v1/", x).href);

const donutCacheBoostingPolicy = createCacheBoostingPolicy(
  `${donutDomain}-assets-cache-boosting`,
  {
    cookiesConfig: { cookieBehavior: "none" },
    headersConfig: { headerBehavior: "none" },
    queryStringsConfig: { queryStringBehavior: "none" },
  }
);
const donutSecurityHeadersPolicy = createSecurityHeadersAndPermissionsPolicy(
  `${donutDomain}-security-headers`,
  {}
);
const webCacheBoostingPolicy = createCacheBoostingPolicy(
  `${webDomain}-assets-cache-boosting`,
  {
    cookiesConfig: { cookieBehavior: "none" },
    headersConfig: { headerBehavior: "none" },
    queryStringsConfig: { queryStringBehavior: "none" },
  }
);
const webSecurityHeadersPolicy = createSecurityHeadersAndPermissionsPolicy(
  `${webDomain}-security-headers`,
  {}
);

const { lambda: authLambda } = AuthEdgeLambda.create("hc-auth-lambda");
export const websites: Record<string, WebsiteExport> = {
  [donutDomain]: siteExports(
    Website.create(donutDomain, {
      assetsCachePolicyId: donutCacheBoostingPolicy.id,
      assetResponseHeadersPolicyId:
        CloudFront.ManagedResponseHeaderPolicy
          .CORSwithPreflightAndSecurityHeadersPolicy,
      cachePolicyId: CloudFront.ManagedCachePolicy.CachingOptimized,
      responseHeadersPolicyId: donutSecurityHeadersPolicy.id,
      extraOrigins: [
        {
          originId: "hackerProfiles",
          domainName: hackerProfilesBucket.bucketRegionalDomainName,
          s3OriginConfig: {
            originAccessIdentity: hackersOai.cloudfrontAccessIdentityPath,
          },
        },
      ],
      extraCacheBehaviors: [
        {
          pathPattern: "hackers/*",
          targetOriginId: "hackerProfiles",
          allowedMethods: ["GET", "HEAD", "OPTIONS"],
          cachedMethods: ["GET", "HEAD"],
          viewerProtocolPolicy: "redirect-to-https",
          compress: true,
          cachePolicyId: CloudFront.ManagedCachePolicy.CachingOptimized,
          responseHeadersPolicyId:
            CloudFront.ManagedResponseHeaderPolicy.SecurityHeadersPolicy,
          originRequestPolicyId:
            CloudFront.ManagedOriginRequestPolicy.AllViewer,
        },
      ],
      edgeLambdas: ["/hacker/*", "/registrace/", "/admin/"].map((pathPattern) =>
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
  [webDomain]: siteExports(
    Website.create(webDomain, {
      assetsCachePolicyId: webCacheBoostingPolicy.id,
      assetResponseHeadersPolicyId:
        CloudFront.ManagedResponseHeaderPolicy
          .CORSwithPreflightAndSecurityHeadersPolicy,
      cachePolicyId: CloudFront.ManagedCachePolicy.CachingOptimized,
      responseHeadersPolicyId: webSecurityHeadersPolicy.id,
    })
  ),
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
