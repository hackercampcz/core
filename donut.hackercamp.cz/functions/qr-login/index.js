/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const payload = await request.text();
  const uuid = crypto.randomUUID();
  const key = `qr-login/${uuid}`;
  await env.HCKR_KV.put(key, payload, { expirationTtl: 120 });
  const link = `https://donut.hckr.camp/${key}`;
  return Response.json({ link });
}
