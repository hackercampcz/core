export const Template = {
  NewRegistration: 34068966,
  PlusOneRegistration: 34068946,
  HackerRegistration: 34068967,
  HackerInvitation: 34068964,
  PlusOneInvitation: 34068947,
  VolunteerSlackInvite: 34068978,
  SlackInvite: 34068981,
  AttendeesInfoMail: 34068963,
  VolunteerInvitation: 34068992,
  HackerPush: 34068980,
  Feedback: 34068945,
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
      }).filter(([_, v]) => Boolean(v)),
    ),
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

/**
 * @param token
 * @param {string[]} emails Max 500 e-mails in one batch
 * @param templateId
 * @param templateAlias
 * @param data
 * @param from
 * @param replyTo
 * @param attachments
 * @param messageStream
 * @param tag
 * @returns {Promise<unknown>}
 */
export async function sendEmailsWithTemplate({
  token,
  emails,
  templateId,
  templateAlias,
  data,
  from = "Hacker Camp Crew <team@hackercamp.cz>",
  replyTo,
  attachments,
  messageStream = "broadcast",
  tag,
}) {
  if (emails.length > 500) throw new Error("Maximum number of emails exceeded");
  const body = JSON.stringify({
    Messages: emails.map(to =>
      Object.fromEntries(
        Object.entries({
          From: from,
          To: to,
          TemplateId: templateId,
          TemplateAlias: templateAlias,
          TemplateModel: templateId ? data ?? {} : data,
          Tag: tag,
          MessageStream: messageStream,
          ReplyTo: replyTo,
          Attachments: attachments,
        }).filter(([_, v]) => Boolean(v)),
      )
    ),
  });
  const resp = await fetch("https://api.postmarkapp.com/email/batchWithTemplates", {
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
