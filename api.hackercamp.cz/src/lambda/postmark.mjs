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
