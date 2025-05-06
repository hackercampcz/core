import { getAuthHeader, createInvoice, sendInvoiceEmail } from "@hackercamp/lib/fakturoid.js";

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const formData = await request.formData();
  const authHeader = await getAuthHeader(env.FAKTUROID_CLIENT_ID, env.FAKTUROID_CLIENT_SECRET);

  const texts = formData.getAll("text");
  const counts = formData.getAll("count").map(x => parseInt(x, 10));
  const prices = formData.getAll("price").map(x => parseInt(x, 10));

  const invoice = await createInvoice(authHeader, {
    subjectId: formData.get("subjectId"),
    note: formData.get("note"),
    lines: texts.map((text, i) => ({ text, count: counts[i], price: prices[i] })),
  });
  const resp = await sendInvoiceEmail(authHeader, invoice.id);
  if (!resp.ok) {
    await sendInvoiceEmail(authHeader, invoice.id, formData.get("email"));
  }
  return Response.json({
    id: invoice.id,
    url: invoice.public_html_url,
    mail: resp.ok ? "ok" : resp.errors
  });
}
