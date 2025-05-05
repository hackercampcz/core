import { getTicketPrice, ticketName } from "./admin/common.js";
import { setReturnUrl, signOut } from "./lib/profile.js";
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

async function markRegistrationAsInvoiced(year, email, data) {
  const resp = await withErrorReporting(withAuthHandler(fetch("https://api.hackercamp.cz/v1/admin/registrations", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      command: "invoiced",
      params: {
        registrations: [{ year, email }],
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

async function searchSubjects(invRegNo, invEmail, contact, invName) {
  const sub = await Promise.all([
    invRegNo ? getSubject(invRegNo) : null,
    getSubject(invEmail ?? contact),
    getSubject(invName),
  ].filter(Boolean));
  return new Map(sub.flat().map(x => [x.id, x]));
}


export async function main({ env, searchParams }) {
  rollbar.init(env);

  const isModal = searchParams.has("modal");
  if (isModal) {
    document.body.classList.add("modal-view");
  }

  const year = parseInt(searchParams.get("year") ?? env.year);
  const email = searchParams.get("email");

  if (!email) console.error("No email provided");

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
    await markRegistrationAsInvoiced(year, email, data);
    if (isModal) {
      window.parent.postMessage({ event: "invoiced", invoiceId: data.id })
    } else {
      location.assign(`/admin/?view=registrations&year=${year}`);
    }
  }));

  invoiceForm.year.value = year;
  invoiceForm.email.value = email;

  const reg = await getRegistration(year, email);

  document.getElementById("name").textContent = reg.invName;
  document.getElementById("address").textContent = reg.invAddress;
  document.getElementById("email").textContent = reg.invEmail ?? reg["invoice-contact"];
  document.getElementById("regNo").textContent = reg.invRegNo ? `IČO: ${reg.invRegNo}` : "";
  document.getElementById("vatId").textContent = reg.invVatNo ? `DIČ: ${reg.invVatNo}` : "";

  invoiceForm.note.value = `Hacker Camp ${year}`;
  invoiceForm.count.value = 1;
  invoiceForm.text.value = reg.invText ?? ticketName.get(reg.ticketType);
  invoiceForm.price.value = getTicketPrice(reg);

  const { invRegNo, invVatNo, invAddress, invEmail, invName, ["invoice-contact"]: contact } = reg;
  const subsById = await searchSubjects(invRegNo, invEmail, contact, invName);
  const subjectSet = document.getElementById("subject");
  renderSubjects(subjectSet, subsById, async e => {
    const subject = Object.fromEntries(Object.entries({
      "name": invName,
      "email": invEmail ?? contact ?? email,
      "street": invAddress,
      "registration_no": invRegNo,
      "vat_no": invVatNo,
    }).filter(([_, v]) => Boolean(v)));
    await createSubject(subject);
    document.location.reload();
  });
}
