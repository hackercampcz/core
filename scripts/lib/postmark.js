function calendarEvent(startDate, endDate) {
  return btoa(`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//hckr.camp//Donut
CALSCALE:GREGORIAN
BEGIN:VTIMEZONE
TZID:Europe/Prague
LAST-MODIFIED:20240422T053450Z
TZURL:https://www.tzurl.org/zoneinfo-outlook/Europe/Prague
X-LIC-LOCATION:Europe/Prague
BEGIN:DAYLIGHT
TZNAME:CEST
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZNAME:CET
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTAMP:${new Date().toISOString().replaceAll(/[-:]/g, "").substring(0, 15)}Z
UID:${crypto.randomUUID()}@hckr.camp
DTSTART;VALUE=DATE:${startDate}
DTEND;VALUE=DATE:${endDate}
SUMMARY:Hacker Camp
URL:https://www.hackercamp.cz/
LOCATION:Sobeňák\\, Starý Rožmitál 148\\, 262 42 Rožmitál pod Třemšínem
END:VEVENT
END:VCALENDAR`);
}

export const Attachments = {
  Event2024: {
    Name: "invite.ics",
    Content: calendarEvent("20240829", "20240901"),
    ContentType: "text/calendar; charset=utf-8; method=REQUEST",
    Disposition: "inline"
  },
  Event2025: {
    Name: "invite.ics",
    Content: calendarEvent("20250828", "20250831"),
    ContentType: "text/calendar; charset=utf-8; method=REQUEST",
    Disposition: "inline"
  }
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
  ColdHackerPush: 34068979,
  HackerPush: 34068980,
  HackerFinalInfo: 34068965,
  Feedback: 34068945,
  Adhoc: 37072925
};

export async function sendEmailWithTemplate(
  {
    token,
    templateId,
    templateAlias,
    data,
    from = "Hacker Camp Crew <team@hackercamp.cz>",
    to,
    replyTo,
    attachments,
    messageStream,
    tag
  }
) {
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
        Attachments: attachments
      }).filter(([_, v]) => Boolean(v))
    )
  );
  const resp = await fetch("https://api.postmarkapp.com/email/withTemplate", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-Postmark-Server-Token": token },
    body
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
    console.error(await resp.json());
    throw new Error("Mail not send");
  }
  return resp.json();
}
