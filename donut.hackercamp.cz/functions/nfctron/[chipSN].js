/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ env, params }) {
  const chipSNToSlackId = new Map(await env.HCKR_KV.get("chipSNToSlackID"));
  const slackIds = chipSNToSlackId.get(params.chipSN) ?? [];
  return Response.json(slackIds);
}
