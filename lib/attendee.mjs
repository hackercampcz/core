export const attributes = new Set([
  "housing",
  "stayTimeCustom",
  "email",
  "invoice_id",
  "invoiced",
  "paid",
  "company",
  "ticketType",
  "travel",
  "year",
  "patronAllowance",
]);

export const mapper = ([k, v]) =>
  k === "housing" ? [k, v === "glamping" ? "tent" : v] : [k, v];
