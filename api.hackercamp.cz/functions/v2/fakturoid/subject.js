import { getPayload } from "#lib/request.js";
import { createSubject, getAuthHeader, searchSubject } from "@hackercamp/lib/fakturoid.js";

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ request, env }) {
  const query = new URL(request.url).searchParams.get("q");
  const authHeader = await getAuthHeader(env.FAKTUROID_CLIENT_ID, env.FAKTUROID_CLIENT_SECRET);
  const result = await searchSubject(authHeader, query);
  return Response.json(result);
}

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const data = await getPayload(request);
  const authHeader = await getAuthHeader(env.FAKTUROID_CLIENT_ID, env.FAKTUROID_CLIENT_SECRET);
  try {
    const subject = await createSubject(authHeader, data);
    return Response.json(subject);
  } catch (err) {
    return Response.json({ error: "Failed to create subject", ...err.details }, { status: 422 });
  }
}
