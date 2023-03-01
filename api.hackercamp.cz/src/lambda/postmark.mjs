export const Template = {
  HackerRegistration: parseInt(process.env["hc-hacker-registration"], 10),
  NewRegistration: parseInt(process.env["hc-registration-new"], 10),
  RegistrationApproved: parseInt(process.env["hc-registration-approved"], 10),
  PlusOneInvitation: parseInt(process.env["hc-plus-one-invitation"], 10),
  PlusOneRegistration: parseInt(process.env["hc-plus-one-registration"], 10),
  SlackInvite: parseInt(process.env["hc-slack-invitation"], 10),
  VolunteerSlackInvite:  parseInt(process.env["hc-volunteer-slack-invitation"], 10),
  HackerInvitation:  parseInt(process.env["hc-hacker-invitation"], 10),
  AttendeesInfoMail:  parseInt(process.env["hc-attendee-info"], 10),
  HackerInvitationLate: 28122158,
};

export async function sendEmailWithTemplate({
  token,
  templateId,
  data,
  from,
  to,
}) {
  console.log({ event: "Sending mail", to, templateId });
  const resp = await fetch("https://api.postmarkapp.com/email/withTemplate", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      TemplateId: templateId,
      TemplateModel: data,
      From: from,
      To: to,
      MessageStream: "outbound",
    }),
  });
  if (!resp.ok) {
    console.error(await resp.json());
    throw new Error("Mail not send");
  }
  return resp.json();
}
