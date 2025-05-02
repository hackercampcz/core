import { getTicketPrice, ticketName } from "./admin/common.js";
import { setReturnUrl, signOut } from "./lib/profile.js";
import { withAuthHandler } from "./lib/remoting.js";
import * as rollbar from "./lib/rollbar.js";

async function getRegistration(year, email) {
  const params = new URLSearchParams({ year, email, slackID: "Z" });
  const resp = await withAuthHandler(fetch(`https://api.hackercamp.cz/v1/registration?${params}`), {
    onUnauthenticated() {
      setReturnUrl(location.href);
      return new Promise((resolve, reject) => {
        signOut((path) => new URL(path, apiHost).href);
        reject({ unauthenticated: true });
      });
    },
    onUnauthorized() {
      return Promise.reject({ unauthorized: true });
    }
  });
  return resp.json();
}

async function getSubject(q) {
  const params = new URLSearchParams({ q });
  const resp = await withAuthHandler(fetch(`https://api.hackercamp.cz/v2/fakturoid/subject?${params}`, {
    credentials: "include",
    mode: "cors"
  }), {
    onUnauthenticated() {
      setReturnUrl(location.href);
      return new Promise((resolve, reject) => {
        signOut((path) => new URL(path, apiHost).href);
        reject({ unauthenticated: true });
      });
    },
    onUnauthorized() {
      return Promise.reject({ unauthorized: true });
    }
  });
  return resp.json();
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

  invoiceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.target.querySelector("button").disabled = true;
    const formData = new FormData(e.target);
    const resp = await fetch(e.target.action, {
      method: "POST",
      body: new URLSearchParams(formData),
      credentials: "include",
      mode: "cors"
    });
    const data = await resp.json();

    try {
      await fetch("https://api.hackercamp.cz/v1/admin/registrations", {
        method: "POST",
        headers: {
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
      });
    } catch (error) {
      rollbar.error(error);
    }
    if (isModal) {
      window.parent.postMessage({ event: "invoiced", invoiceId: data.id })
    } else {
      location.assign(`/admin/?view=registrations&year=${year}`);
    }
  });

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

  const sub = await Promise.all([
    reg.invRegNo ? getSubject(reg.invRegNo) : null,
    getSubject(reg.invEmail ?? reg["invoice-contact"]),
    getSubject(reg.invName),
  ].filter(Boolean));
  const subsById = new Map(sub.flat().map(x => [x.id, x]));

  const subjectSet = document.getElementById("subject");
  const subjectTemplate = subjectSet.querySelector("template").content;
  if (subsById.size > 0) {
    const items = document.createDocumentFragment();
    for (const [id, subject] of subsById) {
      const itemEl = subjectTemplate.cloneNode(true);
      itemEl.querySelector("input").value = id;
      const label = itemEl.querySelector("label");
      label.dataset.subjectId = id;
      const identity = `${subject.name} ${subject.registration_no ? `(IČO: ${subject.registration_no}${subject.vat_no ? `; DIČ: ${subject.vat_no}` : ""})` : ""} `;
      label.insertAdjacentText("beforeend", identity);
      const editLink = document.createElement("a");
      editLink.textContent = "upravit";
      editLink.href = `https://app.fakturoid.cz/hackercampcrew/subjects/${id}/edit`;
      editLink.target = "fakturoid";
      editLink.rel = "noopener";
      label.insertAdjacentElement("beforeend", editLink);
      items.appendChild(itemEl);
    }
    subjectSet.querySelector("div").replaceChildren(items);
    subjectSet.querySelector(`input[value='${Array.from(subsById.keys())[0]}']`).checked = true;
  }
}
