export const Attachments = {
  Event2024: {
    Name: "invite.ics",
    Content:
      "QkVHSU46VkNBTEVOREFSDQpWRVJTSU9OOjIuMA0KUFJPRElEOi0vL2ljYWwubWFydWRvdC5jb20vL2lDYWwgRXZlbnQgTWFrZXINCkNBTFNDQUxFOkdSRUdPUklBTg0KQkVHSU46VlRJTUVaT05FDQpUWklEOkV1cm9wZS9QcmFndWUNCkxBU1QtTU9ESUZJRUQ6MjAyMzEyMjJUMjMzMzU4Wg0KVFpVUkw6aHR0cHM6Ly93d3cudHp1cmwub3JnL3pvbmVpbmZvLW91dGxvb2svRXVyb3BlL1ByYWd1ZQ0KWC1MSUMtTE9DQVRJT046RXVyb3BlL1ByYWd1ZQ0KQkVHSU46REFZTElHSFQNClRaTkFNRTpDRVNUDQpUWk9GRlNFVEZST006KzAxMDANClRaT0ZGU0VUVE86KzAyMDANCkRUU1RBUlQ6MTk3MDAzMjlUMDIwMDAwDQpSUlVMRTpGUkVRPVlFQVJMWTtCWU1PTlRIPTM7QllEQVk9LTFTVQ0KRU5EOkRBWUxJR0hUDQpCRUdJTjpTVEFOREFSRA0KVFpOQU1FOkNFVA0KVFpPRkZTRVRGUk9NOiswMjAwDQpUWk9GRlNFVFRPOiswMTAwDQpEVFNUQVJUOjE5NzAxMDI1VDAzMDAwMA0KUlJVTEU6RlJFUT1ZRUFSTFk7QllNT05USD0xMDtCWURBWT0tMVNVDQpFTkQ6U1RBTkRBUkQNCkVORDpWVElNRVpPTkUNCkJFR0lOOlZFVkVOVA0KRFRTVEFNUDoyMDI0MDQxNVQxMjUyNTJaDQpVSUQ6MTcxMzE4NTQ5ODkxMC03MjA4MkBpY2FsLm1hcnVkb3QuY29tDQpEVFNUQVJUO1ZBTFVFPURBVEU6MjAyNDA4MjkNCkRURU5EO1ZBTFVFPURBVEU6MjAyNDA5MDINClNVTU1BUlk6SGFja2VyIENhbXANClVSTDpodHRwczovL3d3dy5oYWNrZXJjYW1wLmN6Lw0KTE9DQVRJT046U29iZcWIw6FrXCwgU3RhcsO9IFJvxb5taXTDoWwgMTQ4XCwgMjYyIDQyIFJvxb5taXTDoWwgcG9kIFTFmWVtxaHDrW5lbVwsIEN6ZWNoaWENCkVORDpWRVZFTlQNCkVORDpWQ0FMRU5EQVI=",
    ContentType: "text/calendar; charset=utf-8; method=REQUEST",
    Disposition: "inline"
  }
};

export const Template = {
  HackerRegistration: parseInt(process.env["hc_hacker_registration"], 10),
  NewRegistration: parseInt(process.env["hc_registration_new"], 10),
  RegistrationApproved: parseInt(process.env["hc_registration_approved"], 10),
  RegistrationPaid: parseInt(process.env["hc_registration_paid"], 10),
  PlusOneInvitation: parseInt(process.env["hc_plus_one_invitation"], 10),
  PlusOneRegistration: parseInt(process.env["hc_plus_one_registration"], 10),
  SlackInvite: parseInt(process.env["hc_slack_invitation"], 10),
  VolunteerSlackInvite: parseInt(process.env["hc_volunteer_slack_invitation"], 10),
  HackerInvitation: parseInt(process.env["hc_hacker_invitation"], 10),
  VolunteerInvitation: parseInt(process.env["hc_volunteer_invitation"], 10),
  AttendeesInfoMail: parseInt(process.env["hc_attendee_info"], 10),
  HackerInvitationLate: 28122158
};

export async function sendEmailWithTemplate(
  {
    token,
    templateId,
    data,
    from = "Hacker Camp Crew <team@hackercamp.cz>",
    to,
    replyTo,
    attachments,
    messageStream = "outbound",
    tag
  }
) {
  if (!templateId) {
    console.log({ event: "No template ID provided. Mail not sent." });
    return;
  }
  console.log({ event: "Sending mail", to, templateId });
  const resp = await fetch("https://api.postmarkapp.com/email/withTemplate", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-Postmark-Server-Token": token },
    body: JSON.stringify(
      Object.fromEntries(
        Object.entries({
          TemplateId: templateId,
          TemplateModel: data,
          From: from,
          To: to,
          Tag: tag,
          ReplyTo: replyTo,
          Attachments: attachments,
          MessageStream: messageStream
        }).filter(([_, v]) => Boolean(v))
      )
    )
  });
  if (!resp.ok) {
    const error = await resp.json();
    console.error(error);
    throw new Error("Mail not send", { cause: error });
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
export async function sendEmailsWithTemplate(
  {
    token,
    emails,
    templateId,
    templateAlias,
    data,
    from = "Hacker Camp Crew <team@hackercamp.cz>",
    replyTo,
    attachments,
    messageStream = "broadcast",
    tag
  }
) {
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
          Attachments: attachments
        }).filter(([_, v]) => Boolean(v))
      )
    )
  });
  const resp = await fetch("https://api.postmarkapp.com/email/batchWithTemplates", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-Postmark-Server-Token": token },
    body
  });
  if (!resp.ok) {
    const error = await resp.json();
    console.error(error);
    throw new Error("Mail not send", { cause: error });
  }
  return resp.json();
}
