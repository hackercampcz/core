import { calendarEvent } from "@hackercamp/lib/calendar.js";

export const Attachments = {
  calendarInvite(startDate, endDate) {
    return {
      Name: "invite.ics",
      Content: calendarEvent(startDate, endDate),
      ContentType: "text/calendar; charset=utf-8; method=REQUEST",
      Disposition: "inline"
    };
  }
};

export function getTemplateId(env, templateName) {
  return Number.parseInt(env[templateName], 10);
}

export const Template = {
  HackerRegistration: "hc_hacker_registration",
  NewRegistration: "hc_registration_new",
  RegistrationApproved: "hc_registration_approved",
  RegistrationPaid: "hc_registration_paid",
  RegistrationTransferred: "hc_registration_transferred",
  PlusOneInvitation: "hc_plus_one_invitation",
  PlusOneRegistration: "hc_plus_one_registration",
  SlackInvite: "hc_slack_invitation",
  VolunteerSlackInvite: "hc_volunteer_slack_invitation",
  HackerInvitation: "hc_hacker_invitation",
  VolunteerInvitation: "hc_volunteer_invitation",
  AttendeesInfoMail: "hc_attendee_info"
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
