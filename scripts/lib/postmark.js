export const Attachments = {
  Event2024: {
    Name: "invite.ics",
    Content:
      "QkVHSU46VkNBTEVOREFSDQpWRVJTSU9OOjIuMA0KUFJPRElEOi0vL2ljYWwubWFydWRvdC5jb20vL2lDYWwgRXZlbnQgTWFrZXINCkNBTFNDQUxFOkdSRUdPUklBTg0KQkVHSU46VlRJTUVaT05FDQpUWklEOkV1cm9wZS9QcmFndWUNCkxBU1QtTU9ESUZJRUQ6MjAyMzEyMjJUMjMzMzU4Wg0KVFpVUkw6aHR0cHM6Ly93d3cudHp1cmwub3JnL3pvbmVpbmZvLW91dGxvb2svRXVyb3BlL1ByYWd1ZQ0KWC1MSUMtTE9DQVRJT046RXVyb3BlL1ByYWd1ZQ0KQkVHSU46REFZTElHSFQNClRaTkFNRTpDRVNUDQpUWk9GRlNFVEZST006KzAxMDANClRaT0ZGU0VUVE86KzAyMDANCkRUU1RBUlQ6MTk3MDAzMjlUMDIwMDAwDQpSUlVMRTpGUkVRPVlFQVJMWTtCWU1PTlRIPTM7QllEQVk9LTFTVQ0KRU5EOkRBWUxJR0hUDQpCRUdJTjpTVEFOREFSRA0KVFpOQU1FOkNFVA0KVFpPRkZTRVRGUk9NOiswMjAwDQpUWk9GRlNFVFRPOiswMTAwDQpEVFNUQVJUOjE5NzAxMDI1VDAzMDAwMA0KUlJVTEU6RlJFUT1ZRUFSTFk7QllNT05USD0xMDtCWURBWT0tMVNVDQpFTkQ6U1RBTkRBUkQNCkVORDpWVElNRVpPTkUNCkJFR0lOOlZFVkVOVA0KRFRTVEFNUDoyMDI0MDQxNVQxMjUyNTJaDQpVSUQ6MTcxMzE4NTQ5ODkxMC03MjA4MkBpY2FsLm1hcnVkb3QuY29tDQpEVFNUQVJUO1ZBTFVFPURBVEU6MjAyNDA4MjkNCkRURU5EO1ZBTFVFPURBVEU6MjAyNDA5MDINClNVTU1BUlk6SGFja2VyIENhbXANClVSTDpodHRwczovL3d3dy5oYWNrZXJjYW1wLmN6Lw0KTE9DQVRJT046U29iZcWIw6FrXCwgU3RhcsO9IFJvxb5taXTDoWwgMTQ4XCwgMjYyIDQyIFJvxb5taXTDoWwgcG9kIFTFmWVtxaHDrW5lbVwsIEN6ZWNoaWENCkVORDpWRVZFTlQNCkVORDpWQ0FMRU5EQVI=",
    ContentType: "text/calendar; charset=utf-8; method=REQUEST",
    Disposition: "inline",
  },
};

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
