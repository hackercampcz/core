import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import {
  registerAutoTags,
  createCertificate,
  createGoogleMxRecords,
  createTxtRecord,
  Website,
  CloudFront,
} from "@topmonks/pulumi-aws";

registerAutoTags({
  "user:Project": pulumi.getProject(),
  "user:Stack": pulumi.getStack(),
});

const config = new pulumi.Config();

const domain = config.get("domain") as string;
const donutDomain = config.get("donut-domain") as string;
const webDomain = config.get("web-domain") as string;

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

const hackerProfilesBucket = new aws.s3.Bucket("hc-hacker-profiles", {
  acl: "private",
  bucketPrefix: "hc-hacker-profiles",
  forceDestroy: true,
});

console.log(hackersOai);

const hackerProfilesBucketPolicy = new aws.s3.BucketPolicy(
  "hc-hacker-profiles",
  {
    bucket: hackerProfilesBucket.bucket,
    policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "1",
          Effect: "Allow",
          Principal: {
            AWS: hackersOai.iamArn,
          },
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${hackerProfilesBucket.bucketDomainName}/*`,
        },
      ],
    }),
  }
);

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
          customOriginConfig: {
            originProtocolPolicy: "http-only",
            httpPort: 80,
            httpsPort: 443,
            originSslProtocols: ["TLSv1.2"],
          },
        },
      ],
      extraCacheBehaviors: [
        {
          pathPattern: "hackers/*",
          targetOriginId: hackerProfilesBucket.arn,
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
