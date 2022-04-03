import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import {
  registerAutoTags,
  createCertificate,
  createGoogleMxRecords,
  createTxtRecord,
  Website,
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

export const websites: any = {
  [donutDomain]: siteExports(Website.create(donutDomain, {})),
  [webDomain]: siteExports(Website.create(webDomain, {})),
};

function siteExports(site) {
  return {
    url: site.url,
    s3BucketUri: site.s3BucketUri,
    s3WebsiteUrl: site.s3WebsiteUrl,
    cloudFrontId: site.cloudFrontId,
  };
}
