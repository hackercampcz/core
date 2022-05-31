export const Template = {
  NewRegistration: 28029948,
  PlusOneRegistration: 28062472,
  HackerRegistration: 28062457,
  HackerInvitation: 28120216,
};

export async function sendEmailWithTemplate({
  token,
  templateId,
  data,
  from,
  to,
  cc,
  bcc,
}) {
  const resp = await fetch("https://api.postmarkapp.com/email/withTemplate", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: {
      TemplateId: templateId,
      TemplateModel: data,
      From: from,
      To: to,
      Cc: cc,
      Bcc: bcc,
      MessageStream: "outbound",
    },
  });
  if (!resp.ok) {
    console.error(await resp.json());
    throw new Error("Mail not send");
  }
  return resp.json();
}
