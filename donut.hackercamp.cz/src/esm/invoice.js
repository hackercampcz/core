import { getTicketPrice, ticketName } from "./admin/common.js";
import { getSlackProfile, setReturnUrl, signOut } from "./lib/profile.js";
import { submitDecorator, withAuthHandler, withErrorReporting } from "./lib/remoting.js";
import * as rollbar from "./lib/rollbar.js";

const authHandler = {
  onUnauthenticated() {
    setReturnUrl(location.href);
    return new Promise((resolve, reject) => {
      signOut((path) => new URL(path, "https://api.hackercamp.cz").href);
      reject({ unauthenticated: true });
    });
  },
  onUnauthorized() {
    return Promise.reject({ unauthorized: true });
  }
};

async function getRegistration(year, email) {
  const params = new URLSearchParams({ year, email, slackID: "Z" });
  const resp = await withAuthHandler(fetch(`https://api.hackercamp.cz/v1/registration?${params}`), authHandler);
  return resp.json();
}

async function markRegistrationAsInvoiced(year, emails, data) {
  const resp = await withErrorReporting(withAuthHandler(fetch("https://api.hackercamp.cz/v1/admin/registrations", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      command: "invoiced",
      params: {
        registrations: emails.map(email => ({ year, email })),
        invoiceId: data.id,
      }
    }),
    credentials: "include",
    mode: "cors"
  }), authHandler), { rollbar });
  return resp.ok;
}

async function getSubject(q) {
  const params = new URLSearchParams({ q });
  const resp = await withAuthHandler(fetch(`https://api.hackercamp.cz/v2/fakturoid/subject?${params}`, {
    credentials: "include",
    mode: "cors"
  }), authHandler);
  return resp.json();
}

async function createSubject(data) {
  const resp = await withErrorReporting(withAuthHandler(fetch("https://api.hackercamp.cz/v2/fakturoid/subject", {
    method: "POST",
    headers: {
      "Accept": "application/json",
    },
    body: new URLSearchParams(data),
    credentials: "include",
    mode: "cors"
  }), authHandler), { rollbar });
  return resp.json();
}

function renderSubjects(subjectSet, subsById, listener) {
  const subjectTemplate = subjectSet.querySelector("template").content;
  const items = subjectSet.ownerDocument.createDocumentFragment();
  if (subsById.size > 0) {
    for (const [id, subject] of subsById) {
      const itemEl = subjectTemplate.cloneNode(true);
      itemEl.querySelector("input").value = id;
      const label = itemEl.querySelector("label");
      label.dataset.subjectId = id;
      const identity = `${subject.name} ${subject.registration_no ? `(IČO: ${subject.registration_no}${subject.vat_no ? `; DIČ: ${subject.vat_no}` : ""})` : ""} `;
      label.insertAdjacentText("beforeend", identity);
      const editLink = subjectSet.ownerDocument.createElement("a");
      editLink.textContent = "upravit";
      editLink.href = `https://app.fakturoid.cz/hackercampcrew/subjects/${id}/edit`;
      editLink.target = "fakturoid";
      editLink.rel = "noopener";
      label.insertAdjacentElement("beforeend", editLink);
      items.appendChild(itemEl);
    }
  }
  const newSubjectBtn = subjectSet.ownerDocument.createElement("button");
  newSubjectBtn.textContent = "Přidat nový kontakt";
  newSubjectBtn.type = "button";
  newSubjectBtn.addEventListener("click", listener, { once: true });
  items.appendChild(newSubjectBtn)
  subjectSet.querySelector("div").replaceChildren(items);
  const firstItem = subjectSet.querySelector(`input[value='${Array.from(subsById.keys())[0]}']`);
  if (firstItem) firstItem.checked = true;
  return subjectSet;
}

async function searchSubjects(invRegNo, invEmail, invName) {
  const sub = await Promise.all([
    invRegNo ? getSubject(invRegNo) : null,
    getSubject(invEmail),
    getSubject(invName),
  ].filter(Boolean));
  return sub.flat().map(x => [x.id, x]);
}


export async function main({ env, searchParams }) {
  rollbar.init(env);

  const profile = getSlackProfile();
  rollbar.configure({
    payload: {
      person: {
        name: profile.real_name,
        email: profile.email,
        id: profile.id,
      }
    }
  });

  const isModal = searchParams.has("modal");
  if (isModal) {
    document.body.classList.add("modal-view");
  }

  const year = parseInt(searchParams.get("year") ?? env.year);
  const emails = searchParams.getAll("email");

  if (!emails.length) console.error("No email provided");

  const invoiceForm = document.forms.invoice;

  invoiceForm.addEventListener("submit", submitDecorator(async (e) => {
    const formData = new FormData(e.target);
    const resp = await withErrorReporting(fetch(e.target.action, {
      method: "POST",
      body: new URLSearchParams(formData),
      credentials: "include",
      mode: "cors"
    }), { rollbar });
    const data = await resp.json();
    await markRegistrationAsInvoiced(year, emails, data);
    if (isModal) {
      window.parent.postMessage({ event: "invoiced", invoiceId: data.id })
    } else {
      location.assign(`/admin/?view=registrations&year=${year}`);
    }
  }));

  invoiceForm.email.value = emails[0];
  invoiceForm.note.value = `Hacker Camp ${year}`;

  const contact = document.getElementById("contact");
  const contactFragment = document.createDocumentFragment();
  const contacts = [];

  function addContact(reg) {
    contacts.push(reg);
    const contactEl = contact.content.cloneNode(true);
    contactEl.querySelector(".name").textContent = reg.invName;
    contactEl.querySelector(".address").textContent = reg.invAddress;
    contactEl.querySelector(".email").textContent = reg.invEmail ?? reg["invoice-contact"];
    contactEl.querySelector(".regNo").textContent = reg.invRegNo ? `IČO: ${reg.invRegNo}` : "";
    contactEl.querySelector(".vatId").textContent = reg.invVatNo ? `DIČ: ${reg.invVatNo}` : "";
    contactFragment.appendChild(contactEl);
  }

  const lines = document.getElementById("lines");
  const linesFragment = document.createDocumentFragment();
  const lineTmpl = lines.querySelector("template");

  function addLine(ticket) {
    const lineEl = lineTmpl.content.cloneNode(true);
    lineEl.querySelector(".count").value = ticket.count;
    lineEl.querySelector(".text").value = ticket.text;
    lineEl.querySelector(".price").value = ticket.price;
    linesFragment.appendChild(lineEl);
  }

  const tickets = new Map();

  function addTicket(reg) {
    const ticket = tickets.get(reg.ticketType);
    if (ticket) {
      ticket.count++;
    } else {
      tickets.set(reg.ticketType, {
        count: 1,
        text: reg.invText ?? ticketName.get(reg.ticketType),
        price: getTicketPrice(reg),
      });
    }
  }

  const subsById = new Map();
  const registrations = await Promise.all(emails.map(email => getRegistration(year, email)));
  for (const reg of registrations) {
    if (reg.invAddress) {
      addContact(reg);
    }
    addTicket(reg);
    const {
      invRegNo,
      invEmail,
      invRecipientEmail,
      invName,
      invRecipientFirstname,
      invRecipientLastname,
      ["invoice-contact"]: c
    } = reg;
    const email = invEmail ?? invRecipientEmail ?? c;
    const name = invName ?? `${invRecipientFirstname} ${invRecipientLastname}`;
    const subjects = await searchSubjects(invRegNo, email, name);
    for (const [id, subject] of subjects) {
      subsById.set(id, subject);
    }
  }
  contact.replaceWith(contactFragment);
  for (const ticket of tickets.values()) {
    addLine(ticket);
  }
  lines.appendChild(linesFragment);

  const subjectSet = document.getElementById("subject");
  renderSubjects(subjectSet, subsById, async e => {
    const reg = contacts[0]; // TODO: handle contact selection
    const subject = Object.fromEntries(Object.entries({
      "name": reg.invName,
      "email": reg.invEmail ?? reg["invoice-contact"] ?? reg.email,
      "street": reg.invAddress,
      "registration_no": reg.invRegNo,
      "vat_no": reg.invVatNo,
    }).filter(([_, v]) => Boolean(v)));
    await createSubject(subject);
    document.location.reload();
  });
}
