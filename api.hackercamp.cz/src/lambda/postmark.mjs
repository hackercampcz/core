export const Attachments = {
  Event2025: {
    Name: "invite.ics",
    // TODO: make this dynamic based on ENV with dates of beginning and end of the event
    Content:
      "QkVHSU46VkNBTEVOREFSClZFUlNJT046Mi4wClBST0RJRDotLy9pY2FsLm1hcnVkb3QuY29tLy9pQ2FsIEV2ZW50IE1ha2VyCkNBTFNDQUxFOkdSRUdPUklBTgpCRUdJTjpWVElNRVpPTkUKVFpJRDpFdXJvcGUvUHJhZ3VlCkxBU1QtTU9ESUZJRUQ6MjAyMzEyMjJUMjMzMzU4WgpUWlVSTDpodHRwczovL3d3dy50enVybC5vcmcvem9uZWluZm8tb3V0bG9vay9FdXJvcGUvUHJhZ3VlClgtTElDLUxPQ0FUSU9OOkV1cm9wZS9QcmFndWUKQkVHSU46REFZTElHSFQKVFpOQU1FOkNFU1QKVFpPRkZTRVRGUk9NOiswMTAwClRaT0ZGU0VUVE86KzAyMDAKRFRTVEFSVDoxOTcwMDMyOVQwMjAwMDAKUlJVTEU6RlJFUT1ZRUFSTFk7QllNT05USD0zO0JZREFZPS0xU1UKRU5EOkRBWUxJR0hUCkJFR0lOOlNUQU5EQVJEClRaTkFNRTpDRVQKVFpPRkZTRVRGUk9NOiswMjAwClRaT0ZGU0VUVE86KzAxMDAKRFRTVEFSVDoxOTcwMTAyNVQwMzAwMDAKUlJVTEU6RlJFUT1ZRUFSTFk7QllNT05USD0xMDtCWURBWT0tMVNVCkVORDpTVEFOREFSRApFTkQ6VlRJTUVaT05FCkJFR0lOOlZFVkVOVApEVFNUQU1QOjIwMjUwNjA5VDEyNTI1MloKVUlEOjE3MTMxODU0OTg5MTAtNzIwODJAaWNhbC5tYXJ1ZG90LmNvbQpEVFNUQVJUO1ZBTFVFPURBVEU6MjAyNTA4MjgKRFRFTkQ7VkFMVUU9REFURToyMDI1MDkwMQpTVU1NQVJZOkhhY2tlciBDYW1wClVSTDpodHRwczovL3d3dy5oYWNrZXJjYW1wLmN6LwpMT0NBVElPTjpTb2JlxYjDoWtcLCBTdGFyw70gUm/Fvm1pdMOhbCAxNDhcLCAyNjIgNDIgUm/Fvm1pdMOhbCBwb2QgVMWZZW3FocOtbmVtXCwgQ3plY2hpYQpFTkQ6VkVWRU5UCkVORDpWQ0FMRU5EQVI=",
    ContentType: "text/calendar; charset=utf-8; method=REQUEST",
    Disposition: "inline"
  }
};

export const Template = {
  HackerRegistration: parseInt(process.env["hc_hacker_registration"], 10),
  NewRegistration: parseInt(process.env["hc_registration_new"], 10),
  RegistrationApproved: parseInt(process.env["hc_registration_approved"], 10),
  RegistrationPaid: parseInt(process.env["hc_registration_paid"], 10),
  RegistrationTransferred: parseInt(process.env["hc_registration_transferred"], 10),
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
