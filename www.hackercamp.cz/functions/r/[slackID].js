export async function onRequestGet({ params }) {
  const { slackID } = params;
  const query = new URLSearchParams({ referral: slackID });
  return Response.redirect(`https://www.hackercamp.cz/registrace/?${query}`);
}
