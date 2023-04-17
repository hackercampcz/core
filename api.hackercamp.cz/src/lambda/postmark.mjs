export const Template = {
  HackerRegistration: parseInt(process.env["hc_hacker_registration"], 10),
  NewRegistration: parseInt(process.env["hc_registration_new"], 10),
  RegistrationApproved: parseInt(process.env["hc_registration_approved"], 10),
  RegistrationPaid: parseInt(process.env["hc_registration_paid"], 10),
  PlusOneInvitation: parseInt(process.env["hc_plus_one_invitation"], 10),
  PlusOneRegistration: parseInt(process.env["hc_plus_one_registration"], 10),
  SlackInvite: parseInt(process.env["hc_slack_invitation"], 10),
  VolunteerSlackInvite: parseInt(
    process.env["hc_volunteer_slack_invitation"],
    10
  ),
  HackerInvitation: parseInt(process.env["hc_hacker_invitation"], 10),
  VolunteerInvitation: parseInt(process.env["hc_volunteer_invitation"], 10),
  AttendeesInfoMail: parseInt(process.env["hc_attendee_info"], 10),
  HackerInvitationLate: 28122158,
};

export async function sendEmailWithTemplate({
  token,
  templateId,
  data,
  from,
  to,
}) {
  if (!templateId) {
    console.log({ event: "No template ID provided. Mail not sent." });
    return;
  }
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
