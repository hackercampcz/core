import { getAuthHeader, searchSubject } from "@hackercamp/lib/fakturoid.js";

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ request, env }) {
  const query = new URL(request.url).searchParams.get("q");
  const authHeader = await getAuthHeader(env.FAKTUROID_CLIENT_ID, env.FAKTUROID_CLIENT_SECRET);
  const result = await searchSubject(authHeader, query);
  return Response.json(result, {
    headers: {
      "Access-Control-Allow-Credentials": "true"
    }
  });
}
