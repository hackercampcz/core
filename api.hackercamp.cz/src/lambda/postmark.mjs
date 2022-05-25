import { fetch } from "@adobe/helix-fetch";

export const Template = {
  NewRegistration: 28029948,

};

export function sendEmailWithTemplate({ token, templateId, data, from, to }) {
  return fetch("https://api.postmarkapp.com/email/withTemplate", {
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
      MessageStream: "outbound",
    },
  });
}
