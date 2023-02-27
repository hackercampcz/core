export const Template = {
  NewRegistration: 28029948,
  PlusOneRegistration: 28062472,
  HackerRegistration: 28062457,
  HackerInvitation: 28120216,
  HackerInvitationLate: 28122158,
  HackersReminder: 28432253,
  PlusOneInvitation: 28151070,
  VolunteerSlackInvite: 28672994,
  SlackInvite: 28750357,
  AttendeesInfoMail: 28768871,
  HackerApproved: 28848093,
};

export async function sendEmailWithTemplate({
  token,
  templateId,
  data,
  from,
  to,
}) {
  console.log({ event: "Sending mail", to, templateId });
  const resp = await fetch("https://api.postmarkapp.com/email/withTemplate", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      TemplateId: templateId,
      TemplateModel: data,
      From: from,
      To: to,
      MessageStream: "outbound",
    }),
  });
  if (!resp.ok) {
    console.error(await resp.json());
    throw new Error("Mail not send");
  }
  return resp.json();
}
