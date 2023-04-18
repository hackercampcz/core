export const Template = {
  NewRegistration: 30944901,
  PlusOneRegistration: 30944876,
  HackerRegistration: 30944917,
  HackerInvitation: 30945225,
  HackerInvitationLate: 28122158,
  HackersReminder: 28432253,
  PlusOneInvitation: 30945167,
  VolunteerSlackInvite: 30945168,
  SlackInvite: 30945181,
  AttendeesInfoMail: 30945078,
  LastYearHackersPush: 28896807,
  ThisYearsHackersPush: 28896811,
  Feedback: 29143589,
  VolunteerInvitation: 31455038,
};

export async function sendEmailWithTemplate({
  token,
  templateId,
  templateAlias,
  data,
  from,
  to,
  replyTo,
}) {
  const body = JSON.stringify(
    Object.fromEntries(
      Object.entries({
        From: from,
        To: to,
        TemplateId: templateId,
        TemplateAlias: templateAlias,
        TemplateModel: data,
        ReplyTo: replyTo,
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
