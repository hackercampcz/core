import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import {
  registerAutoTags,
  createCertificate,
  createGoogleMxRecords,
  createTxtRecord,
  Website,
  CloudFront,
} from "@topmonks/pulumi-aws";
import { createApi, routes } from "./api.hackercamp.cz";
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
  "hc-google-site-verification",
  domain,
  "google-site-verification=eIaBVqhznPV-0AAEEbFJN82j3w063w_tW0-DUZWX5C0"
);

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

const api = createApi("hc-api", "v1", apiDomain, routes.get("v1"));
export const apiUrl = api.url.apply((x) => new URL("/v1/", x).href);

const { lambda: authLambda } = AuthEdgeLambda.create("hc-auth-lambda");
export const websites: Record<string, WebsiteExport> = {
  [donutDomain]: siteExports(
    Website.create(donutDomain, {
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
      edgeLambdas: [
        {
          pathPattern: "/*",
          lambdaAssociation: {
            eventType: "viewer-request",
            lambdaArn: authLambda.arn,
          },
        },
      ],
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
