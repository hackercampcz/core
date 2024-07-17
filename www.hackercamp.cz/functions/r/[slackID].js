/**
 * Redirects a short registration URL format to full on
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({ params }) {
  const { slackID } = params;
  const query = new URLSearchParams({ referral: slackID });
  return Response.redirect(`https://www.hackercamp.cz/registrace/?${query}`);
}
