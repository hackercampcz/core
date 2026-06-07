import event from "@hackercamp/lib/event.js";
import ticket from "@hackercamp/lib/ticket.js";

export default {
  meta: {
    title: "Hacker Camp",
    url: "https://www.hackercamp.cz/",
    lang: "cs",
    generator: "@hckr_/blendid - static site generator and assets pipeline"
  },
  year: 2026,
  get currentYear() {
    return Temporal.Now.plainDateISO().year;
  },
  event,
  ticket
};
