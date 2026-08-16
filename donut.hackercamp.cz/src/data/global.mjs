import event from "@hackercamp/lib/event.js";
import ticket from "@hackercamp/lib/ticket.js";

function byVariant({ name, type }) {
  return x => x.type === type && x.variant === name;
}

export default {
  meta: {
    lang: "cs"
  },
  get currentYear() {
    return Temporal.Now.plainDateISO().year;
  },
  year: 2026,
  program: {
    enabledSheetEdit: true
  },
  event,
  ticket,
  byVariant
};
