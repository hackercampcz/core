import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";
import {Output} from "@pulumi/pulumi";
import * as fs from "node:fs";
import {registerAutoTags} from "./autotag";
import {createDB, createQueues} from "./aws";
import {readTemplates} from "./communication";
import * as postmark from "./postmark";

registerAutoTags({
  "user:Project": pulumi.getProject(),
  "user:Stack": pulumi.getStack()
});

const config = new pulumi.Config();
const awsConfig = new pulumi.Config("aws");
const cloudflarePagesConfig = new pulumi.Config("cloudflare-pages");
const cloudflareInfraConfig = new pulumi.Config("cloudflare-infra");
const postmarkConfig = new pulumi.Config("postmark");

const domain = config.require("domain");
const donutDomain = config.require("donut-domain");
const webDomain = config.require("web-domain");
const apiDomain = config.require("api-domain");
const compatibilityDate = cloudflarePagesConfig.require("compatibility-date");
const redirectIPv4 = cloudflareInfraConfig.require("redirect-ipv4");
const redirectIPv6 = cloudflareInfraConfig.require("redirect-ipv6");

const account = new cloudflare.Account(
  "rarous",
  {
    name: "rarous",
    settings: {
      enforceTwofactor: true
    }
  },
  { protect: true }
);

const hackercampCzZone = new cloudflare.Zone(
  "hackercamp.cz",
  {
    account: { id: account.id },
    name: domain
  },
  { protect: true }
);

const hckrCampZone = new cloudflare.Zone(
  "hckr.camp",
  {
    account: { id: account.id },
    name: "hckr.camp"
  },
  { protect: true }
);

const postmarkLayout = new postmark.Template("postmark-layout", {
  Name: "Hackercamp styling",
  Alias: `hc-basic`,
  Subject: "Template",
  HtmlBody: fs.readFileSync("../communication/layout.html").toString(),
  TextBody: `{{{ @content }}}`,
  TemplateType: "Layout",
  LayoutTemplate: ""
});
export const postmarkTemplates: Record<string, Output<string>> = {};

for (const args of readTemplates("../communication/")) {
  const template = new postmark.Template(
    `postmark-template-${args.Name}`,
    args,
    { dependsOn: [postmarkLayout] }
  );
  const key = args.Alias.replace(/-/g, "_");
  postmarkTemplates[key] = template.id;
}

export const queues = createQueues({ postmarkTemplates });

const db = createDB({ queues, postmarkTemplates });

export const dataTables = {
  registrations: db.registrationsDataTable,
  contacts: db.contactsDataTable,
  optOuts: db.optOutsDataTable,
  attendees: db.attendeesDataTable,
  program: db.programDataTable,
  postmark: db.postmarkDataTable,
  trash: db.trashDataTable
};

export const apiUrl = new URL("/v2/", `https://${apiDomain}`).href;

const webPages = new cloudflare.PagesProject("web", {
  accountId: account.id,
  name: "hackercamp-web",
  productionBranch: "trunk",
  deploymentConfigs: {
    preview: {
      failOpen: false
    },
    production: {
      failOpen: false,
      compatibilityDate,
      envVars: {
        HC_API_HOSTNAME: { type: "plain_text", value: config.require("api-domain") },
        HC_DONUT_HOSTNAME: { type: "plain_text", value: config.require("donut-domain") },
        HC_WEB_HOSTNAME: { type: "plain_text", value: config.require("domain") },
        HC_START_DATE: { type: "plain_text", value: config.require("start-date") },
        HC_END_DATE: { type: "plain_text", value: config.require("end-date") }
      }
    }
  }
});

// APEX records for redirect to www (redirect is currently handled in hckr.studio/webs stack)
new cloudflare.DnsRecord(`${webDomain}/apex-dns-record`, {
  zoneId: hackercampCzZone.id,
  name: "@",
  type: "A",
  content: redirectIPv4,
  ttl: 1,
  proxied: true
});

new cloudflare.DnsRecord(`${webDomain}/apex-ipv6-dns-record`, {
  zoneId: hackercampCzZone.id,
  name: "@",
  type: "AAAA",
  content: redirectIPv6,
  ttl: 1,
  proxied: true
});

const wwwRecord = new cloudflare.DnsRecord(`${webDomain}/dns-record`, {
  zoneId: hackercampCzZone.id,
  name: "www",
  type: "CNAME",
  content: webPages.domains[0],
  ttl: 1,
  proxied: true
});

const webPagesDomain = new cloudflare.PagesDomain("web-domain", {
  accountId: account.id,
  name: pulumi.interpolate`${wwwRecord.name}`,
  projectName: webPages.name
});

export const webUrl = pulumi.interpolate`https://${webPagesDomain.name}/`;

const donutPages = new cloudflare.PagesProject("donut", {
  accountId: account.id,
  name: "hackercamp-donut",
  productionBranch: "trunk",
  deploymentConfigs: {
    preview: {
      failOpen: false
    },
    production: {
      failOpen: false,
      compatibilityDate,
      envVars: {
        HC_API_HOSTNAME: { type: "plain_text", value: config.require("api-domain") },
        HC_DONUT_HOSTNAME: { type: "plain_text", value: config.require("donut-domain") },
        HC_WEB_HOSTNAME: { type: "plain_text", value: config.require("domain") },
        HC_JWT_SECRET: { type: "secret_text", value: config.require("private-key") }
      }
    }
  }
});

const donutRecord = new cloudflare.DnsRecord(`${donutDomain}/dns-record`, {
  zoneId: hackercampCzZone.id,
  name: "donut",
  type: "CNAME",
  content: donutPages.domains[0],
  ttl: 1,
  proxied: true
});

const donutPagesDomain = new cloudflare.PagesDomain("donut-domain", {
  accountId: account.id,
  name: pulumi.interpolate`${donutRecord.name}`,
  projectName: donutPages.name
});

export const donutUrl = pulumi.interpolate`https://${donutPagesDomain.name}/`;

const apiPages = new cloudflare.PagesProject("api", {
  accountId: account.id,
  name: "hackercamp-api",
  productionBranch: "trunk",
  deploymentConfigs: {
    preview: {
      failOpen: false
    },
    production: {
      failOpen: false,
      compatibilityDate,
      envVars: {
        API_HOST: { type: "plain_text", value: new URL("/v1/", apiUrl).href },
        AWS_ACCESS_KEY_ID: { type: "plain_text", value: config.require("aws-access-key-id") },
        AWS_SECRET_ACCESS_KEY: { type: "secret_text", value: config.require("aws-secret-access-key") },
        AWS_REGION: { type: "plain_text", value: awsConfig.require("region") },
        FAKTUROID_CLIENT_ID: { type: "plain_text", value: config.require("fakturoid-client-id") },
        FAKTUROID_CLIENT_SECRET: { type: "secret_text", value: config.require("fakturoid-client-secret") },
        GOOGLE_API_KEY: { type: "secret_text", value: config.require("google-api-key") },
        GOOGLE_CALENDAR_PROGRAM_ID: { type: "plain_text", value: config.require("google-calendar-program-id") },
        HC_API_HOSTNAME: { type: "plain_text", value: config.require("api-domain") },
        HC_DONUT_HOSTNAME: { type: "plain_text", value: config.require("donut-domain") },
        HC_JWT_SECRET: { type: "secret_text", value: config.require("private-key") },
        HC_WEB_HOSTNAME: { type: "plain_text", value: config.require("domain") },
        NFCTRON_BEARER_TOKEN: { type: "secret_text", value: config.require("nfctron-bearer-token") },
        NFCTRON_EVENT_ID: { type: "plain_text", value: config.require("nfctron-event-id") },
        ROLLBAR_TOKEN: { type: "secret_text", value: config.require("rollbar-access-token") },
        hostname: { type: "secret_text", value: config.require("web-domain") },
        donut: { type: "secret_text", value: config.require("donut-domain") },
        year: { type: "plain_text", value: config.require("year") },
        start_date: { type: "plain_text", value: config.require("start-date") },
        end_date: { type: "plain_text", value: config.require("end-date") },
        algolia_app_id: { type: "plain_text", value: config.require("algolia-app-id") },
        algolia_search_key: { type: "plain_text", value: config.require("algolia-search-key") },
        algolia_attendees_index: { type: "plain_text", value: config.require("algolia-attendees-index-name") },
        algolia_registrations_index: { type: "plain_text", value: config.require("algolia-registrations-index-name") },
        db_table_attendees: { type: "plain_text", value: dataTables.attendees },
        db_table_contacts: { type: "plain_text", value: dataTables.contacts },
        db_table_optouts: { type: "plain_text", value: dataTables.optOuts },
        db_table_postmark: { type: "plain_text", value: dataTables.postmark },
        db_table_registrations: { type: "plain_text", value: dataTables.registrations },
        db_table_trash: { type: "plain_text", value: dataTables.trash },
        fakturoid_webhook_token: { type: "secret_text", value: config.require("fakturoid-webhook-token") },
        nfc_tron_queue_url: { type: "plain_text", value: queues.nfcTronQueueUrl },
        postmark_token: { type: "secret_text", value: postmarkConfig.require("server-api-token") },
        postmark_webhook_token: { type: "secret_text", value: config.require("postmark-webhook-token") },
        slack_queue_url: { type: "plain_text", value: queues.slackQueueUrl },
        slack_webhook_token: { type: "secret_text", value: config.require("slack-webhook-token") },
        slack_client_id: { type: "plain_text", value: config.require("slack-client-id") },
        slack_client_secret: { type: "secret_text", value: config.require("slack-client-secret") },
        private_key: { type: "secret_text", value: config.require("private-key") }
      }
    }
  }
});

const apiRecord = new cloudflare.DnsRecord(`${apiDomain}/dns-record`, {
  zoneId: hackercampCzZone.id,
  name: "api",
  type: "CNAME",
  content: apiPages.domains[0],
  ttl: 1,
  proxied: true
});

const apiPagesDomain = new cloudflare.PagesDomain("api-domain", {
  accountId: account.id,
  name: pulumi.interpolate`${apiRecord.name}`,
  projectName: apiPages.name
});

export const newApiUrl = pulumi.interpolate`https://${apiPagesDomain.name}/v2/`;

new cloudflare.DnsRecord(`hckr.camp/apex-dns-record`, {
  zoneId: hckrCampZone.id,
  name: "@",
  type: "A",
  content: redirectIPv4,
  ttl: 1,
  proxied: true
});

new cloudflare.DnsRecord(`hckr.camp/apex-ipv6-dns-record`, {
  zoneId: hckrCampZone.id,
  name: "@",
  type: "AAAA",
  content: redirectIPv6,
  ttl: 1,
  proxied: true
});

new cloudflare.DnsRecord(`hckr.camp/www-dns-record`, {
  zoneId: hckrCampZone.id,
  name: "www",
  type: "A",
  content: redirectIPv4,
  ttl: 1,
  proxied: true
});

new cloudflare.DnsRecord(`hckr.camp/www-ipv6-dns-record`, {
  zoneId: hckrCampZone.id,
  name: "www",
  type: "AAAA",
  content: redirectIPv6,
  ttl: 1,
  proxied: true
});

new cloudflare.DnsRecord(`hckr.camp/donut-dns-record`, {
  zoneId: hckrCampZone.id,
  name: "donut",
  type: "A",
  content: redirectIPv4,
  ttl: 1,
  proxied: true
});

new cloudflare.DnsRecord(`hckr.camp/donut-ipv6-dns-record`, {
  zoneId: hckrCampZone.id,
  name: "donut",
  type: "AAAA",
  content: redirectIPv6,
  ttl: 1,
  proxied: true
});

new cloudflare.Ruleset("hckr.camp", {
  zoneId: hckrCampZone.id,
  name: "Redirect to hackercamp.cz",
  kind: "zone",
  phase: "http_request_dynamic_redirect",
  rules: [
    {
      description: "Redirect hckr.camp to www.hackercamp.cz",
      expression: `(http.host eq "hckr.camp")`,
      action: "redirect",
      actionParameters: {
        fromValue: {
          statusCode: 301,
          preserveQueryString: true,
          targetUrl: {
            expression: `concat("https://www.hackercamp.cz", http.request.uri.path)`
          }
        }
      }
    },
    {
      description: "Redirect donut.hckr.camp to donut.hackercamp.cz",
      expression: `(http.host eq "donut.hckr.camp")`,
      action: "redirect",
      actionParameters: {
        fromValue: {
          statusCode: 301,
          preserveQueryString: true,
          targetUrl: {
            expression: `concat("https://donut.hackercamp.cz", http.request.uri.path)`
          }
        }
      }
    }
  ]
});

new cloudflare.Ruleset("hackercamp.cz", {
  zoneId: hackercampCzZone.id,
  name: "Redirects on hackercamp.cz",
  kind: "zone",
  phase: "http_request_dynamic_redirect",
  rules: [
    {
      description: "Redirect referral links",
      expression: `(http.request.uri.path eq "/r/dobrovolnik")`,
      action: "redirect",
      actionParameters: {
        fromValue: {
          statusCode: 301,
          targetUrl: {
            value: "/registrace/?volunteer=1"
          }
        }
      }
    },
    {
      description: "Redirect referral links",
      expression: `(starts_with(http.request.uri.path, "/r/"))`,
      action: "redirect",
      actionParameters: {
        fromValue: {
          statusCode: 301,
          targetUrl: {
            expression: `concat("/registrace/?referral=", substring(http.request.uri.path, 3))`
          }
        }
      }
    }
  ]
});
