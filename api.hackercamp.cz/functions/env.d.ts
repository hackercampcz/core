export interface Env {
  API_HOST: string;

  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;

  FAKTUROID_CLIENT_ID: string;
  FAKTUROID_CLIENT_SECRET: string;

  GOOGLE_API_KEY: string;
  GOOGLE_CALENDAR_PROGRAM_ID: string;

  HC_API_HOSTNAME: string;
  HC_DONUT_HOSTNAME: string;
  HC_JWT_SECRET: string;
  HC_WEB_HOSTNAME: string;
  HCKR_KV: KVNamespace;

  NFCTRON_BEARER_TOKEN: string;
  NFCTRON_EVENT_ID: string;

  ROLLBAR_TOKEN: string;

  year: string;
  hostname: string;
  donut: string;
  start_date: string;
  end_date: string;

  algolia_app_id: string;
  algolia_search_key: string;
  algolia_attendees_index: string;
  algolia_registrations_index: string;

  db_table_attendees: string;
  db_table_contacts: string;
  db_table_optouts: string;
  db_table_postmark: string;
  db_table_registrations: string;
  db_table_trash: string;

  fakturoid_webhook_token: string;
  nfc_tron_queue_url: string;
  postmark_token: string;
  postmark_webhook_token: string;
  slack_queue_url: string;
  slack_webhook_token: string;
  slack_client_id: string;
  slack_client_secret: string;
  private_key: string;
}
