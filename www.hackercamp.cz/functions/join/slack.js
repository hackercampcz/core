/**
 * Redirects a short registration URL format to full on
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({}) {
  return Response.redirect(
    `https://join.slack.com/t/hackercampworkspace/shared_invite/zt-1fbbmqd4x-~SnrAkSZU6LImDRPzD56ag`,
  );
}
