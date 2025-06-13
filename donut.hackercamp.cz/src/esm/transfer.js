import { getSlackProfile, setReturnUrl, signOut } from "./lib/profile.js";
import { submitDecorator, withAuthHandler, withErrorReporting } from "./lib/remoting.js";
import * as rollbar from "./lib/rollbar.js";

const authHandler = {
  onUnauthenticated() {
    setReturnUrl(location.href);
    return new Promise((resolve, reject) => {
      signOut(path => new URL(path, "https://api.hackercamp.cz").href);
      reject({ unauthenticated: true });
    });
  },
  onUnauthorized() {
    return Promise.reject({ unauthorized: true });
  }
};

async function getPreviousTickets(email, env) {
  const params = new URLSearchParams({ email });
  const resp = await withErrorReporting(
    withAuthHandler(fetch(new URL(`attendees?${params}`, env["api-host"])), authHandler),
    { rollbar }
  );
  const attendees = await resp.json();
  return attendees;
}

export async function main({ env, searchParams }) {
  rollbar.init(env);

  const profile = getSlackProfile();
  rollbar.configure({ payload: { person: { name: profile.real_name, email: profile.email, id: profile.id } } });

  const isModal = searchParams.has("modal");
  if (isModal) {
    document.body.classList.add("modal-view");
  }

  const year = parseInt(searchParams.get("year") ?? env.year);
  const email = searchParams.get("email");

  if (!email) console.error("No email provided");

  const registration = { email, year };

  const transferForm = document.forms.transfer;

  transferForm.addEventListener(
    "submit",
    submitDecorator(async e => {
      const formData = new FormData(e.target);

      const payload = { registration, attendee: Object.fromEntries(formData), admin: profile.email };
      if (isModal) {
        window.parent.postMessage({ type: "transfer", payload });
      } else {
        location.assign(`/admin/?view=registrations&year=${year}`);
      }
    })
  );

  const attendees = await getPreviousTickets(email, env);

  const attendeeSet = document.getElementById("attendee");
  const attendeeTemplate = attendeeSet.querySelector("template").content;
  const items = attendeeSet.ownerDocument.createDocumentFragment();

  for (const { slackID: { S: slackID }, year: { N: year } } of attendees) {
    transferForm.slackID.value = slackID;
    const item = attendeeTemplate.cloneNode(true);
    item.querySelector("label").appendChild(document.createTextNode(year));
    item.querySelector("input[name=year]").value = year;
    items.appendChild(item);
  }
  if (!attendees.length) {
    items.appendChild(Object.assign(document.createElement("p"), {
      textContent: "Nic jsem nenašlo."
    }));
  }
  attendeeSet.querySelector(".options").replaceChildren(items);
}
