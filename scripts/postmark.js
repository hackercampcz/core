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
  LastYearHackersPush: 28896807,
  ThisYearsHackersPush: 28896811,
  Feedback: 29143589,
};

export async function sendEmailWithTemplate({
  token,
  templateId,
  templateAlias,
  data,
  from,
  to,
}) {
  const body = JSON.stringify(
    Object.fromEntries(
      Object.entries({
        From: from,
        To: to,
        TemplateId: templateId,
        TemplateAlias: templateAlias,
        TemplateModel: data,
      }).filter(([_, v]) => Boolean(v))
    )
  );
  const resp = await fetch("https://api.postmarkapp.com/email/withTemplate", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body,
  });
  if (!resp.ok) {
    console.error(await resp.json());
    throw new Error("Mail not send");
  }
  return resp.json();
}
