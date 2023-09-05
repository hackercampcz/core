import "@material/mwc-drawer/mwc-drawer.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/button/text-button.js";
import "@material/web/checkbox/checkbox.js";
import "@material/web/icon/icon.js";
import "@material/web/list/list.js";
import "@material/web/list/list-item.js";
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/textfield/filled-text-field.js";
import { defAtom } from "@thi.ng/atom";
import { html, render } from "lit-html";
import {
  Action,
  dispatchAction,
  Endpoint,
  executeCommand,
  getDialog,
  View,
} from "./admin/common.js";
import {
  getContact,
  getSlackProfile,
  setReturnUrl,
  signOut,
} from "./lib/profile.js";
import { withAuthHandler } from "./lib/remoting.js";
import { initRenderLoop, renderScheduler } from "./lib/renderer.js";
import * as rollbar from "./lib/rollbar.js";
import { renderEventForm } from "./event-form.js";
import { schedule } from "./lib/schedule.js";
import { showModalDialog } from "./modal-dialog.js";
import { instatializeDates } from "./lib/object.js";

const state = defAtom({
  year: 2023,
  selectedView: View.confirmed,
  query: "",
  view: renderView,
  apiHost: "",
  params: new URLSearchParams(location.search),
  campStartAt: new Date(),
  campEndAt: new Date(),
  selection: new Set(),
  nfcTronData: new Set(),
});

const transact = (fn, atom = state) => atom.swap(fn);

// export for dev experience
globalThis.transact = transact;
globalThis.getState = () => state.deref();

/**
 * @param {string} email
 * @param year
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function createOptOut(email, year, apiHost) {
  return executeCommand(apiHost, Endpoint.registrations, "optout", {
    email,
    year,
  }).then(() => location.reload());
}

function optout(email) {
  const { apiHost, year } = state.deref();
  return (
    confirm("Opravdu chceš táborníka vyřadit?") &&
    createOptOut(email, year, apiHost)
  );
}

/**
 * @param {string} email
 * @param year
 * @param {string} slackID
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function createOptIn(email, year, slackID, apiHost) {
  return executeCommand(apiHost, Endpoint.registrations, "approve", {
    email,
    referral: slackID,
    year,
  }).then(() => location.reload());
}

function optin(email) {
  const { apiHost, year, contact } = state.deref();
  if (!contact) {
    return alert(
      "Vypadá to, že ti vypršelo přihlášení. Zkus se znovu přihlásit a akci opakuj."
    );
  }
  return (
    confirm("Opravdu chceš táborníka potvrdit?") &&
    createOptIn(email, year, contact.slackID, apiHost)
  );
}

function moveToTrash(email, year, slackID, apiHost) {
  return executeCommand(apiHost, Endpoint.registrations, "move-to-trash", {
    email,
    year,
    slackID,
  });
}

function trashRegistration(email) {
  const { apiHost, year, contact } = state.deref();
  if (!contact) {
    return alert(
      "Vypadá to, že ti vypršelo přihlášení. Zkus se znovu přihlásit a akci opakuj."
    );
  }
  return (
    confirm("Opravdu chceš táborníka smáznout?") &&
    moveToTrash(email, year, contact.slackID, apiHost)
  );
}

/**
 * @param {string[]} emails
 * @param year
 * @param {string} invoiceId
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function markAsInvoiced(emails, year, invoiceId, apiHost) {
  return executeCommand(apiHost, Endpoint.registrations, "invoiced", {
    registrations: emails.map((email) => ({ email, year })),
    invoiceId,
  }).then(() => location.reload());
}

function invoiced(email) {
  const { apiHost, year } = state.deref();
  const invoiceId = prompt("Zadej ID faktury");
  return markAsInvoiced([email], year, invoiceId, apiHost);
}

function invoiceSelected(invoiceId) {
  const { apiHost, year, selection } = state.deref();
  return markAsInvoiced(Array.from(selection), year, invoiceId, apiHost);
}

function approveSelectedVolunteers() {
  const { apiHost, year, selection, contact } = state.deref();

  if (!contact) {
    return alert(
      "Vypadá to, že ti vypršelo přihlášení. Zkus se znovu přihlásit a akci opakuj."
    );
  }

  const emails = Array.from(selection);
  return executeCommand(apiHost, Endpoint.registrations, "approveVolunteer", {
    registrations: emails.map((email) => ({ email, year })),
    referral: contact.slackID,
  }).then(() => location.reload());
}

/**
 * @param {string} event_id
 * @param {number} year
 * @param people
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function markEventAsRemoved(event_id, year, people, apiHost) {
  return executeCommand(apiHost, Endpoint.program, "delete", {
    event_id,
    people,
    year,
  }).then(() => location.reload());
}

/**
 * @param {string} event_id
 * @param {number} year
 * @param {Object} updates
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function saveEditedEvent(event_id, year, updates, apiHost) {
  return executeCommand(apiHost, Endpoint.program, "edit", {
    event_id,
    year,
    ...updates,
  }).then(() => location.reload());
}

function deleteEvent(event_id, people) {
  const { apiHost, year } = state.deref();
  return (
    confirm("Opravdu chceš event smazat?") &&
    markEventAsRemoved(event_id, year, people, apiHost)
  );
}

/**
 * @param {string} event_id
 * @param {number} year
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function markEventAsApproved(event_id, year, apiHost) {
  return executeCommand(apiHost, Endpoint.program, "approve", {
    event_id,
    year,
  }).then(() => location.reload());
}

function approveEvent(event_id) {
  const { apiHost, year } = state.deref();
  return (
    confirm("Opravdu chceš event schválit?") &&
    markEventAsApproved(event_id, year, apiHost)
  );
}

function editEvent(event_id, updates) {
  const { apiHost, year } = state.deref();
  return saveEditedEvent(event_id, year, updates, apiHost);
}

function renderDetail(detail) {
  const items = detail.nfcTronData?.length
    ? detail.nfcTronData.map((x) => x.sn)
    : [""];
  const nfcTronData = new Set(items);
  transact((x) => Object.assign(x, { detail, nfcTronData }));
}

function closeDetail() {
  transact((x) => Object.assign(x, { detail: null }));
}

async function renderModalDialog(name) {
  const root = document.getElementById("modal-root");
  const template = getDialog(name);
  render(template(state.deref()), root);
  showModalDialog("modal");
  const modalScheduler = renderScheduler();
  state.addWatch("renderModal", (id, prev, curr) => {
    const { view } = curr;
    if (typeof view !== "function") return;
    modalScheduler({
      preFirstRender() {},
      async render() {
        console.log("Modal re-render");
        render(template(state.deref()), root);
      },
    });
  });
}

async function showEditEventModalDialog(event, { editEvent }) {
  const { campStartAt, campEndAt, apiHost, data } = state.deref();
  const root = document.getElementById("program-modal-root");
  renderEventForm(root, {
    apiHost,
    profile: getSlackProfile(),
    lineupId: event.lineup,
    //header: adminEditEventHeaderTemplate(),
    campStartAt,
    campEndAt,
    preferredTime: new Date(event.startAt),
    hijackHacker: true,
    events: instatializeDates(await data),
    selectedTopic: event.topic,
    editingEvent: event,
    onEventSubmit(e) {
      e.preventDefault(); // super important here
      const data = new FormData(e.target);
      const json = Object.fromEntries(data.entries());
      editEvent(event._id, json).catch((error) => {
        console.error(error);
        window.snackbar.labelText = error.message;
        window.snackbar.show();
      });
    },
  });
  showModalDialog("program-modal");
}

const registrationViews = new Set([
  View.paid,
  View.invoiced,
  View.confirmed,
  View.hackers,
  View.waitingList,
  View.volunteer,
  View.staff,
  View.optouts,
  View.search,
]);
const attendeeViews = new Set([
  View.attendees,
  View.hackerAttendees,
  View.staffAttendees,
  View.crewAttendees,
  View.volunteerAttendees,
  View.searchAttendees,
]);

const programViews = new Set(["program", "programApproval"]);

async function renderView(state) {
  const { selectedView } = state;
  if (registrationViews.has(selectedView)) {
    const { registrationsTemplate } = await import("./admin-registrations.js");
    return registrationsTemplate(state);
  }
  if (attendeeViews.has(selectedView)) {
    const { attendeesTemplate } = await import("./admin-attendees.js");
    return attendeesTemplate(state);
  }
  if (programViews.has(selectedView)) {
    const { programTemplate } = await import("./admin-program.js");
    return programTemplate(state);
  }
  switch (selectedView) {
    case View.housing:
      const { housingTemplate } = await import("./admin-housing.js");
      return housingTemplate(state);
    default:
      return html`Pohled do neznáma`;
  }
}

const endpointForView = new Map([
  [View.paid, Endpoint.registrations],
  [View.invoiced, Endpoint.registrations],
  [View.confirmed, Endpoint.registrations],
  [View.hackers, Endpoint.registrations],
  [View.optouts, Endpoint.registrations],
  [View.waitingList, Endpoint.registrations],
  [View.volunteer, Endpoint.registrations],
  [View.staff, Endpoint.registrations],
  [View.search, Endpoint.registrations],
  [View.searchAttendees, Endpoint.attendees],
  [View.attendees, Endpoint.attendees],
  [View.crewAttendees, Endpoint.attendees],
  [View.hackerAttendees, Endpoint.attendees],
  [View.volunteerAttendees, Endpoint.attendees],
  [View.staffAttendees, Endpoint.attendees],
  [View.program, Endpoint.program],
  [View.programApproval, Endpoint.program],
  [View.housing, Endpoint.housing],
]);

async function fetchData({ selectedView, year, page, query }, apiHost) {
  const params = new URLSearchParams({ type: selectedView, year, page, query });
  const endpoint = endpointForView.get(selectedView);
  const resource = new URL(`admin/${endpoint}?${params}`, apiHost).href;
  const resp = await withAuthHandler(
    fetch(resource, { credentials: "include" }),
    {
      onUnauthenticated() {
        setReturnUrl(location.href);
        return new Promise((resolve, reject) => {
          signOut((path) => new URL(path, apiHost).href);
          reject({ unauthenticated: true });
        });
      },
      onUnauthorized() {
        return Promise.reject({ unauthorized: true });
      },
    }
  );
  return resp.json();
}

async function getNfcTronData(attendee, apiUrl) {
  for (const chip of attendee.nfcTronData?.filter((x) => x.sn) ?? []) {
    const params = new URLSearchParams({ chipID: chip.chipID });
    const resp = await fetch(apiUrl(`nfctron?${params}`), {
      headers: { Accept: "application/json" },
    });
    const data = await resp.json();
    chip.spent = data.totalSpent / 100;
  }
  return attendee;
}

/**
 * @param {string} selectedView
 * @param {number} year
 * @param {number} page
 * @param {string} query
 * @param {string} apiHost
 */
function loadData(selectedView, year, page, query, apiHost) {
  transact((x) =>
    Object.assign(x, {
      selectedView,
      data: fetchData({ selectedView, year, page, query }, apiHost),
    })
  );
}

const endpointName = new Map([
  [Endpoint.registrations, "Registrace"],
  [Endpoint.attendees, "Účastníci"],
  [Endpoint.housing, "Ubytování"],
  [Endpoint.program, "Program"],
]);

function changeTitle(viewTitle, view) {
  const endpoint = endpointForView.get(view);
  viewTitle.textContent = endpointName.get(endpoint);
}

async function handleMessage(e) {
  const { type, payload } = e.data;
  switch (type) {
    case Action.optin:
      optin(payload.email);
      break;
    case Action.optout:
      optout(payload.email);
      break;
    case Action.trashRegistration:
      trashRegistration(payload.email);
      break;
    case Action.invoiced:
      await invoiced(payload.email);
      break;
    case Action.invoiceSelected:
      await invoiceSelected(payload.invoiceId);
      break;
    case Action.approveSelectedVolunteers:
      await approveSelectedVolunteers();
      break;
    case Action.renderDetail:
      const { apiHost } = state.deref();
      const apiUrl = (x) => new URL(x, apiHost).href;
      const attendee = await getNfcTronData(payload.detail, apiUrl);
      renderDetail(attendee);
      break;
    case Action.closeDetail: {
      closeDetail();
      break;
    }
    case Action.editEvent: {
      await editEvent(payload.eventId, payload.updates);
      break;
    }
    case Action.deleteEvent: {
      deleteEvent(payload.eventId, payload.people);
      break;
    }
    case Action.approveEvent: {
      approveEvent(payload.eventId);
      break;
    }
    case Action.showModalDialog: {
      await renderModalDialog(payload.name);
      break;
    }
    case Action.select: {
      transact((x) => {
        for (const key of payload.keys) {
          x.selection.add(key);
        }
        return x;
      });
      break;
    }
    case Action.unselect: {
      transact((x) => {
        if (payload.all) {
          x.selection.clear();
        } else {
          x.selection.delete(payload.key);
        }
        return x;
      });
      break;
    }
    case Action.startNfcScan: {
      try {
        const ndef = new NDEFReader();
        await ndef.scan();
        console.log("NCF Reader started");

        ndef.addEventListener("readingerror", (e) => {
          console.error(e);
        });

        ndef.addEventListener("reading", (e) => {
          console.log(e);
          const sn = e.serialNumber.replaceAll(":", "");
          dispatchAction(Action.addChip, { sn });
        });
      } catch (err) {
        console.error(err);
      }
      break;
    }
    case Action.addChip: {
      console.log({ event: "add chip", payload });
      transact((state) => {
        state.nfcTronData.add(payload.sn);
        return state;
      });
      break;
    }
    case Action.removeChip: {
      console.log({ event: "remove chip", payload });
      transact((state) => {
        state.nfcTronData.delete(payload.sn);
        return state;
      });
      break;
    }
  }
}

export async function main({
  appRoot,
  searchParams,
  env,
  viewTitle,
  yearSelector,
}) {
  rollbar.init(env);

  const year = parseInt(searchParams.get("year") ?? env.year);
  const page = parseInt(searchParams.get("page") ?? 0);
  const selectedView = searchParams.get("view") ?? View.confirmed;
  const query = searchParams.get("query") ?? "";
  console.log(searchParams.toString());
  const apiHost = env["api-host"];
  const contact = getContact();
  const isNFCSupported = typeof NDEFReader !== "undefined";

  yearSelector.value = year;
  yearSelector.addEventListener("change", (e) => {
    location.assign(
      `?${new URLSearchParams({ year: e.target.value, view: selectedView })}`
    );
  });

  addEventListener("message", handleMessage);

  transact((x) =>
    Object.assign(
      x,
      {
        apiHost,
        year,
        page,
        query,
        contact,
        params: searchParams,
        isNFCSupported,
      },
      schedule.get(year)
    )
  );
  initRenderLoop(state, appRoot, { keepContent: true });
  changeTitle(viewTitle, selectedView);
  loadData(selectedView, year, page, query, apiHost);
}
