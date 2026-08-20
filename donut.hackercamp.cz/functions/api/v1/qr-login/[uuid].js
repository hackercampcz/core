/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ env, params }) {
  const { uuid } = params;
  const key = `qr-login/${uuid}`;
  const data = await env.HCKR_KV.get(key, "json");
  if (!data) {
    return new Response(null, { status: 404 });
  }
  return Response.json(data);
}
