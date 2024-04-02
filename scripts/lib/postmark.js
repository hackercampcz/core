export const Template = {
  // TODO : update
  NewRegistration: 30944901,
  PlusOneRegistration: 30944876,
  HackerRegistration: 30944917,
  HackerInvitation: 30945225,
  PlusOneInvitation: 30945167,
  VolunteerSlackInvite: 30945168,
  SlackInvite: 30945181,
  AttendeesInfoMail: 30945078,
  VolunteerInvitation: 31455038,
  HackerPush: 31533299,
  Feedback: 33045403,
};

export async function sendEmailWithTemplate({
  token,
  templateId,
  templateAlias,
  data,
  from,
  to,
  replyTo,
  attachments,
  messageStream,
  tag,
}) {
  const body = JSON.stringify(
    Object.fromEntries(
      Object.entries({
        From: from,
        To: to,
        TemplateId: templateId,
        TemplateAlias: templateAlias,
        TemplateModel: data,
        Tag: tag,
        MessageStream: messageStream,
        ReplyTo: replyTo,
        Attachments: attachments,
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
