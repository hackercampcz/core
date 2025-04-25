import rollbarPlugin from "@hckr_/cloudflare-pages-plugin-rollbar";

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function rollbar(context) {
  return rollbarPlugin({ token: context.env.ROLLBAR_TOKEN })(context);
}

export async function cors(context) {
  const response = await context.next();
  response.headers.set("Access-Control-Allow-Origin", context.request.headers.get("origin") ?? "*");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;

}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export const onRequest = [rollbar, cors];
