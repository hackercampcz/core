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
    return new Date().getFullYear();
  },
  year: 2025,
  program: {
    enabledSheetEdit: true
  },
  event,
  ticket,
  byVariant
};
