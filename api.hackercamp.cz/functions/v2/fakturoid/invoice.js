import { getAuthHeader, createInvoice, sendInvoiceEmail } from "@hackercamp/lib/fakturoid.js";

/**
 * @param {EventContext<Env>} context
 * @returns {Promise<Response>}
 */
export async function onRequestPost({ request, env }) {
  const formData = await request.formData();
  const authHeader = await getAuthHeader(env.FAKTUROID_CLIENT_ID, env.FAKTUROID_CLIENT_SECRET);
  const invoice = await createInvoice(authHeader, {
    subjectId: formData.get("subjectId"),
    text: formData.get("text"),
    count: parseInt(formData.get("count")),
    price: parseInt(formData.get("price")),
    note: formData.get("note"),
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
