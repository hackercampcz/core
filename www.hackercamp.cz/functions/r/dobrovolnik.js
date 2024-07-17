/**
 * Redirects a short registration URL format to full on
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestGet({}) {
  const query = new URLSearchParams({ volunteer: 1 });
  return Response.redirect(`https://www.hackercamp.cz/registrace/?${query}`);
}
