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
  const formData = await request.formData();
  const authHeader = await getAuthHeader(env.FAKTUROID_CLIENT_ID, env.FAKTUROID_CLIENT_SECRET);
  try {
    const subject = await createSubject(authHeader, Object.fromEntries(formData));
    return Response.json(subject);
  } catch (err) {
    return Response.json({ error: "Failed to create subject", ...err.details }, { status: 422 });
  }
}
