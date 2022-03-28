import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import {
  registerAutoTags,
  createCertificate,
  Website,
} from "@topmonks/pulumi-aws";

registerAutoTags({
  "user:Project": pulumi.getProject(),
  "user:Stack": pulumi.getStack(),
});

const config = new pulumi.Config();

const donutDomain = config.get("donut-domain") as string;
createCertificate(donutDomain);

const donutSite = Website.create(donutDomain, {});

export const donutUrl = donutSite.url;
export const donutS3BucketUri = donutSite.s3BucketUri;
export const donutS3WebsiteUrl = donutSite.s3WebsiteUrl;
export const donutCloudFrontId = donutSite.cloudFrontId;
