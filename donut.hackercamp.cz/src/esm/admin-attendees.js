import { sortBy } from "@hackercamp/lib/array.js";
import { formatDateTime, formatMoney } from "@hackercamp/lib/format.js";
import { html } from "lit-html";
import { until } from "lit-html/directives/until.js";
import { when } from "lit-html/directives/when.js";
import {
  Action,
  chip,
  closeDetail,
  dispatchAction,
  Endpoint,
  executeCommand,
  registerDialog,
  renderDetail,
  renderModalDialog,
  ticketDetail,
  ticketName,
  unauthorized,
  View
} from "./admin/common.js";
import { housing, ticketBadge, travel } from "./lib/attendee.js";
import "./components/phone-button.js";
import "./components/mail-button.js";
import "./components/slack-avatar.js";
import "./components/feather-icon.js";
import "./components/pagination.js";
import { map } from "lit-html/directives/map.js";
import { iconContactless } from "./lib/icons.js";
import { getContact } from "./lib/profile.js";

/**
 * @param {Object} attendee
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function edit(attendee, apiHost) {
  const contact = getContact();
  return executeCommand(apiHost, Endpoint.attendees, "edit", { ...attendee, editedBy: contact?.email }).then(() =>
    location.reload()
  );
}

/**
 * @param {Object} attendee
 * @param {string} apiHost
 * @returns {Promise<void>}
 */
export function add(attendee, apiHost) {
  return executeCommand(apiHost, Endpoint.attendees, "add", attendee).then(() => location.reload());
}

function selectRow(e) {
  e.stopPropagation();
  const key = e.target.value;
  if (e.target.checked) {
    dispatchAction(Action.select, { keys: [key] });
  } else {
    dispatchAction(Action.unselect, { key });
  }
}

export function attendeesChips(
  view,
  year,
  { attendees, crewAttendees, staffAttendees, volunteerAttendees, hackerAttendees },
  params
) {
  return html`
    <search>
      ${
    when(view === View.searchAttendees, () =>
      html`
            <form name="search">
              <input type="hidden" name="view" value="${View.searchAttendees}">
              <input type="hidden" name="year" value="${year}">
              <slotted-input>
                <button class="icon-button small" type="submit" title="Hledat" aria-label="Hledat">
                  <feather-icon name="search" title="Hledat"></feather-icon>
                </button>
                <input type="text"
                       aria-label="Hledaný výraz"
                       name="query"
                       placeholder="Hledat jméno, e-mail, firmu&hellip;"
                       value="${params.get("query") ?? ""}"
                       autofocus
                       @keyup="${e => {
        if (e.key === "Escape") document.getElementById("hc-search__close").click();
      }}"
                       @change="${e => e.target.form.submit()}">
                <a class="icon-button small"
                   id="hc-search__close"
                   href="/admin/?${new URLSearchParams({ view: View.attendees, year })}"
                   title="Zavřít hledání">
                  <feather-icon name="x" title="Zavřít"></feather-icon>
                </a>
              </slotted-input>
            </form>
          `, () =>
      html`
            <div>
              <a class="icon-button small"
                 href="/admin/?${new URLSearchParams({ view: View.searchAttendees, year })}"
                 aria-label="Hledat" title="Hledat">
                <feather-icon name="search" title="Hledat"></feather-icon>
              </a>
            </div>
            <div
              class="hc-chip-set"
              role="grid"
              id="filters"
              aria-orientation="horizontal"
              aria-multiselectable="false">
              ${
        chip({
          text: "Všichni",
          count: attendees,
          selected: view === View.attendees,
          view: View.attendees,
          year
        })
      }
              ${
        chip({
          text: "Hackeři",
          count: hackerAttendees,
          selected: view === View.hackerAttendees,
          view: View.hackerAttendees,
          year
        })
      }
              ${
        chip({
          text: "Dobrovolníci",
          count: volunteerAttendees,
          selected: view === View.volunteerAttendees,
          view: View.volunteerAttendees,
          year
        })
      }
              ${
        chip({
          text: "Ostatní",
          count: staffAttendees,
          selected: view === View.staffAttendees,
          view: View.staffAttendees,
          year
        })
      }
              ${
        chip({
          text: "Crew",
          count: crewAttendees,
          selected: view === View.crewAttendees,
          view: View.crewAttendees,
          year
        })
      }
            </div>
            <div>
              <button class="icon-button small" title="Zkopírovat statistiky" aria-label="Zkopírovat statistiky"
                      @click="${
        copyToClipboard([attendees, hackerAttendees, volunteerAttendees, staffAttendees, crewAttendees])
      }">
                <feather-icon name="copy" title="Kopírovat"></feather-icon>
              </button>
              <a class="icon-button small" title="Stáhnout CSV" aria-label="Stáhnout CSV"
                 href="https://api.hackercamp.cz/v1/admin/attendees?${new URLSearchParams({
        year,
        type: view,
        format: "csv",
        pageSize: 500
      })}">
                <feather-icon name="download" title="Stáhnout"></feather-icon>
              </a>
              <button class="icon-button small" title="Přidat účastníka" aria-label="Přidat účastníka"
                      @click="${renderModalDialog("add-attendee-modal")}">
                <feather-icon name="user-plus" title="Přidat"></feather-icon>
              </button
              >
            </div>
          `)
  }
    </search>
  `;
}

function copyToClipboard(counts) {
  return async () => {
    const [all, hacker, volunteer, staff, crew] = await Promise.all(counts);
    const rich = new Blob([`<ul>
          <li>Všichni: <b>${all}</b>
          <li>Hackeři: <b>${hacker}</b>
          <li>Dobrovolníci: <b>${volunteer}</b>
          <li>Ostatní: <b>${staff}</b>
          <li>Crew: <b>${crew}</b>
        </ul>`], { type: "text/html" });
    const plain = new Blob([
      `* Všichni: ${all}\n* Hackeři: ${hacker}\n* Dobrovolnící: ${volunteer}\n* Ostatní: ${staff}\n* Dobrovolníci: ${crew}`
    ], { type: "text/plain" });
    await navigator.clipboard.write([new ClipboardItem({ "text/html": rich, "text/plain": plain })]);
    globalThis.showSnackbar("Statistiky zkopírovány do schránky");
  };
}

export function attendeesTableTemplate(data, { page, pages, total, params, selection }) {
  return html`
    <table>
      <thead>
      <tr>
        <th></th>
        <th>Jméno</th>
        <th>Společnost</th>
        <th>Typ lístku</th>
        <th>Zaplaceno</th>
        <th>NFCtron</th>
        <th>Akce</th>
      </tr>
      </thead>
      <tfoot>
      <tr>
        <td colspan="7">
          <hc-pagination page="${page}" pages="${pages}" total="${total}" count="${data.length}" params="${params}"></hc-pagination>
        </td>
      </tr>
      </tfoot>
      <tbody>
      ${
    data.map(row =>
      html`
          <tr @click="${renderDetail(row)}">
            <td>
              <label class="checkbox">
                <input type="checkbox" value="${row.slackID}" @click="${selectRow}"
                       ?checked="${selection.has(row.slackID)}">
                <span class="sr-only">Vybrat</span>
              </label>
            </td>
            <td>${row.name}</td>
            <td>${row.company}</td>
            <td>${ticketName.get(row.ticketType)}</td>
            <td>${row.paid ? formatDateTime(new Date(row.paid)) : ""}</td>
            <td>
              ${row.nfcTronData?.map(({ sn }) => sn).filter(Boolean).join(", ") || html`<em><small>nene</small></em>`}
            </td>
            <td>
                <span class="hc-detail__tools">
                  <hc-mail-button email="${row.email}"></hc-mail-button>
                  <hc-phone-button phone="${row.phone}"></hc-phone-button>
                </span>
            </td>
          </tr>
        `
    )
  }
      </tbody>
    </table>
  `;
}

export function attendeeDetailTemplate({ detail, isNFCSupported }) {
  if (!detail) return null;
  return html`
    <div class="hc-card hc-master-detail__detail" data-slack-id="${detail.slackID}">
      <div style="display: flex; align-items: center; gap: 12px;">
        <button class="icon-button"
                aria-label="Zavřít detail"
                title="Zavřít detail"
                @click="${closeDetail()}">
          <feather-icon name="arrow-left" title="Zpět"></feather-icon>
        </button>
        <h2 style="margin: 0">${detail.name}</h2>
        ${
    when(detail.image, () =>
      html`
            <hc-slack-avatar
              src="${detail.image}" name="${detail.name}"
              badge="${detail.ticketType}"></hc-slack-avatar>`, () => html`${ticketBadge.get(detail.ticketType)}`)
  }
      </div>
      <p>${detail.company}</p>
      <div class="hc-detail__tools">
        <hc-mail-button email="${detail.email}"></hc-mail-button>
        ${
    when(detail.phone, () =>
      html`
          <hc-phone-button phone="${detail.phone}"></hc-phone-button>
      `)
  }
        ${
    when(detail.slackID && !detail.slackID.startsWith("hc-"), () =>
      html`
          <a class="icon-button small" href="https://hackercampworkspace.slack.com/team/${detail.slackID}" target="slack"
             title="Otevřít profil na Slacku">
            <feather-icon name="slack" title="Slack"></feather-icon>
          </a>
        `)
  }
        <button class="icon-button small"
                title="Upravit účastníka"
                @click="${renderModalDialog("edit-attendee-modal")}">
          <feather-icon name="edit" title="Upravit"></feather-icon>
        </button>
        ${
    when(!detail.checkIn, () =>
      html`
          <button class="icon-button small"
                  title="Check In"
                  @click="${
        renderModalDialog("check-in-modal", {
          preDispatch() {
            console.log("Check In", { isNFCSupported });
            if (isNFCSupported) startChipScan();
          }
        })
      }">
            <feather-icon name="log-in" title="Check In"></feather-icon>
          </button>
        `, () =>
      html`
          <button class="icon-button small"
                  title="Check Out"
                  @click="${renderModalDialog("check-out-modal")}">
            <feather-icon name="log-out" title="Check Out"></feather-icon>
          </button>
        `)
  }
      </div>
      ${ticketDetail(detail)}
      <p>
        Ubytování:
        <strong>${housing.get(detail.housing) ?? "Ještě si nevybral"}</strong>
        ${when(detail.housingPlacement, () => html` - <em>${detail.housingPlacement}</em>`)}
      </p>
      ${when(detail.isHeartCore, () => html`<p><big>Dej hackerovi <code>♥︎CORE</code> loopy.</big></p>`)}
      ${
    when(detail.ticketType === "hacker-patron", () => html`<p><big>Dej hackerovi <code>PATRON</code> loopy.</big></p>`)
  }
      <p>
        Doprava:
        <strong>${travel.get(detail.travel) ?? "Ještě si nevybral"}</strong>
      </p>
      <p>Slack ID: <code>${detail.slackID}</code></p>
      <p>
        NFCtron ID(s):
        ${when(!detail.nfcTronData?.length, () => html`<em>nemá</em>`)}
      </p>
      ${
    when(detail.nfcTronData?.length, () =>
      html`
            <ul>
              ${
        map(detail.nfcTronData.filter(({ chipID }) => chipID), ({ chipID, spent, totalSpent, sn }) =>
          html`
                    <li data-chip-sn="${sn}" data-chip-id="${chipID}">
                      <a
                        title="Online účet"
                        href="https://pass.nfctron.com/receipt/v2/${chipID}/"
                      >
                        ${chipID}
                      </a>
                      -
                      <data value="${spent ?? totalSpent}"
                      >${formatMoney(spent ?? totalSpent)}
                      </data
                      >
                      ${when(detail.checkOutPaid, () => html` <strong>zaplaceno</strong>`)}
                    </li>
                  `)
      }
            </ul>
          `)
  }
      ${when(detail.note, () => html`<p>${detail.note}</p>`)}
      ${
    when(detail.checkIn, () =>
      html`
            <p>
              Check in:
              <time datetime="${detail.checkIn}"
              >${formatDateTime(new Date(detail.checkIn))}
              </time
              >
              provedl/a <strong>${detail.checkInBy}</strong>
            </p>`)
  }
      ${when(detail.checkInNote, () => html`<p>${detail.checkInNote}</p>`)}
      ${
    when(detail.checkout, () =>
      html`
            <p>
              Check out:
              <time datetime="${detail.checkout}"
              >${formatDateTime(new Date(detail.checkout))}
              </time
              >
              provedl/a <strong>${detail.checkOutBy}</strong>
            </p>`)
  }
      ${
    when(detail.checkOutTotal, () =>
      html`
            <p>
              Zaplaceno při odchodu:
              <data value="${detail.checkOutTotal}"
              >${formatMoney(parseInt(detail.checkOutTotal))}
              </data
              >
            </p>`)
  }
      ${when(detail.checkOutNote, () => html`<p>${detail.checkOutNote}</p>`)}
      ${
    when(detail.edited, () =>
      html`
            <p>
              Naposledy editováno
              <time datetime="${detail.edited}"
              >${formatDateTime(new Date(detail.edited))}
              </time
              >
              administrátorem
              <strong>${detail.editedBy}</strong>
            </p>
          `)
  }
    </div>
  `;
}

registerDialog("edit-attendee-modal", editAttendeeModalDialog);

function editAttendeeModalDialog({ detail, apiHost }) {
  const onSubmit = async e => {
    const form = new FormData(e.target);
    await edit(Object.fromEntries(form), apiHost);
  };
  return html`
    <form method="dialog" @submit="${onSubmit}">
      <input type="hidden" name="year" value="${detail.year}">
      <input type="hidden" name="slackID" value="${detail.slackID}">
      <div class="field">
        <label for="name">Jméno</label>
        <input id="name" name="name" value="${detail.name}" required>
      </div>
      <div class="field">
        <label for="email">E-mail</label>
        <input
          id="email"
          name="email"
          value="${detail.email}"
          type="email"
          required
        >
      </div>
      <div class="field">
        <label for="ticketType">Typ lístku</label>
        <input id="ticketType" name="ticketType" value="${detail.ticketType}">
      </div>
      <div class="field">
        <label for="company">Společnost</label>
        <input id="company" name="company" value="${detail.company}">
      </div>
      <div class="field">
        <label for="housingPlacement">Ubytování</label>
        <input id="housingPlacement" name="housingPlacement" value="${detail.housingPlacement}">
      </div>
      <div class="field">
        <label for="note">Poznámka</label>
        <input id="note" name="note" value="${detail.note}">
      </div>
      <button type="submit" class="hc-button">Odeslat to</button>
    </form>
  `;
}

registerDialog("add-attendee-modal", addAttendeeModalDialog);

function addAttendeeModalDialog({ year, apiHost }) {
  const onSubmit = async e => {
    const form = new FormData(e.target);
    await add(Object.fromEntries(form.entries()), apiHost);
  };
  return html`
    <form method="dialog" @submit="${onSubmit}">
      <input type="hidden" name="year" value="${year}">
      <div class="field">
        <label for="slackID">Slack ID</label>
        <input id="slackID" name="slackID">
      </div>
      <div class="field">
        <label for="name">Jméno</label>
        <input id="name" name="name" required>
      </div>
      <div class="field">
        <label for="email">E-mail</label>
        <input id="email" name="email" type="email" required>
      </div>
      <div class="field">
        <label for="ticketType">Lístek</label>
        <input id="ticketType" name="ticketType" required value="staff" list="ticketTypes">
        <datalist id="ticketTypes">
          <option>nonprofit</option>
          <option>hacker</option>
          <option>hacker-plus</option>
          <option>hacker-patron</option>
          <option>volunteer</option>
          <option>crew</option>
          <option>staff</option>
        </datalist>
      </div>
      <div class="field">
        <label for="company">Společnost</label>
        <input id="company" name="company">
      </div>
      <div class="field">
        <label for="note">Poznámka</label>
        <input id="note" name="note">
      </div>

      <h3>Fakturace</h3>
      <fieldset id="I-will-pay">
        <legend>Zaplatí sám</legend>
        <div class="field">
          <label for="invoice-name"> Jméno / název společnosti </label>
          <input id="invoice-name" name="invName" type="text">
        </div>
        <div class="field">
          <label for="invoice-address"> Adresa (Ulice č.p.) </label>
          <input id="invoice-address" name="invAddress" type="text">
        </div>
        <div class="group">
          <div class="field">
            <label for="invoice-address-zip">PSČ</label>
            <input type="text" id="invoice-address-zip"
                   name="invAddressZip" pattern="\\d{3}\\s\\d{2}">
          </div>
          <div class="field">
            <label for="invoice-address-city">Město</label>
            <input type="text" id="invoice-address-city"
                   name="invAddressCity">
          </div>
        </div>
        <div class="group">
          <div class="field">
            <label for="invoice-regno"> IČO </label>
            <input id="invoice-regno" name="invRegNo" type="text">
          </div>
          <div class="field">
            <label for="invoice-vatno"> DIČ </label>
            <input id="invoice-vatno" name="invVatNo" type="text">
          </div>
        </div>
        <div class="field">
          <label for="invoice-text"> Text na faktuře </label>
          <input id="invoice-text" name="invText" type="text">
        </div>
        <div class="field">
          <label for="invoice-email"> Kontakt pro fakturaci </label>
          <input
            id="invoice-email"
            name="invEmail"
            type="email"
            autocomplete="email">
        </div>
      </fieldset>

      <fieldset id="someone-else-will-pay">
        <legend>Zaplatí za něj někdo jiný</legend>
        <div class="group">
          <div class="field">
            <label for="invoice-recipient-firstname"> Jméno </label>
            <input
              id="invoice-recipient-firstname"
              name="invRecipientFirstname"
              type="text"
            >
          </div>
          <div class="field">
            <label for="invoice-recipient-lastname"> Příjmení </label>
            <input
              id="invoice-recipient-lastname"
              name="invRecipientLastname"
              type="text"
            >
          </div>
        </div>
        <div class="group">
          <div class="field">
            <label for="invoice-recipient-email"> E-mail </label>
            <input
              id="invoice-recipient-email"
              name="invRecipientEmail"
              type="email"
            >
          </div>
          <div class="field">
            <label for="invoice-recipient-phone"> Telefon </label>
            <input
              id="invoice-recipient-phone"
              name="invRecipientPhone"
              type="tel"
            >
          </div>
        </div>
      </fieldset>

      <button type="submit" class="hc-button">Odeslat to</button>
    </form>
  `;
}

function startChipScan() {
  return dispatchAction(Action.startNfcScan);
}

function removeChip(sn) {
  return e => {
    e.preventDefault();
    dispatchAction(Action.removeChip, { sn });
    globalThis.showSnackbar("Chip odebrán");
  };
}

registerDialog("check-in-modal", checkInModalDialog);

function checkInModalDialog({ apiHost, year, detail, contact, nfcTronData, isNFCSupported }) {
  const onSubmit = async e => {
    const formData = new FormData(e.target);
    const data = {
      admin: contact.email,
      year: formData.get("year"),
      slackID: formData.get("slackID"),
      note: formData.get("note"),
      nfcTronData: Array.from(nfcTronData).filter(Boolean).map(sn => ({ sn }))
    };
    try {
      const result = executeCommand(apiHost, Endpoint.attendees, "checkIn", data);
      globalThis.showSnackbar("Check-in uložen");
      return result;
    } catch (err) {
      globalThis.showPersistentSnackbar("Check-in neuložen");
    }
  };
  const onChange = e => {
    const sn = e.target.value.trim().toLowerCase();
    if (sn.length > 0) dispatchAction(Action.addChip, { sn });
  };
  return html`
    <form method="dialog" @submit="${onSubmit}">
      <input type="hidden" name="year" value="${year}">
      <input type="hidden" name="slackID" value="${detail.slackID}">
      <h2>Check-in</h2>
      ${when(detail.isHeartCore, () => html`<p><big>Dej hackerovi <code>♥︎CORE</code> loopy.</big></p>`)}
      ${
    when(detail.ticketType === "hacker-patron", () => html`<p><big>Dej hackerovi <code>PATRON</code> loopy.</big></p>`)
  }
      <p>
        Ubytování:
        <strong>${housing.get(detail.housing) ?? html`Ještě si nevybral`}</strong>
        <!-- TODO: add link to housing selection -->
        ${when(detail.housingPlacement, () => html` - <em>${detail.housingPlacement}</em>`)}
      </p>
      <fieldset>
        <legend>NCF Tron</legend>
        ${
    when(!isNFCSupported, () =>
      html`<p>
              Pro scanování chipů použij Chrome na mobilním telefonu se systémem
              Android.
            </p>`, () =>
      html`<p>
              Přilož čip pro načtení. Případně opiš druhý řádek na rubu čipu
              ručně.
            </p>`)
  }
        ${
    map(nfcTronData, (sn, i) => {
      return html`
              <div class="field">
                <label for="nfc-tron-sn-${i}">S/N #${i + 1}</label>
                <slotted-input>
                  <input type="text" id="nfc-tron-sn-${i}" name="nfcTronSN${i}" value="${sn}" @change="${onChange}">
                  ${
        when(
          sn === "",
          () => html`<button type="button" disabled class="icon-button">${iconContactless()}</button>`,
          () =>
            html`
                        <button class="icon-button small"
                                type="button"
                                title="Odebrat" aria-label="Odebrat"
                                @click="${removeChip(sn)}">
                          <feather-icon name="minus-circle" title="Odebrat"></feather-icon>
                        </button>
                      `
        )
      }
                </slotted-input>
                <div>
                  <strong>SN čipu:</strong>
                  ${
        when(sn, () =>
          html`<code>
                        <data value="${sn}">${sn}</data>
                      </code>`, () => html`<code>neznámý čip</code>`)
      }
                </div>
              </div>
            `;
    })
  }
      </fieldset>
      <fieldset>
        <legend>Další</legend>
        <div class="field">
          <label for="note">Poznámka</label>
          <textarea id="note" name="note"></textarea>
        </div>
      </fieldset>
      <button type="submit" class="hc-button">Odeslat to</button>
    </form>
  `;
}

registerDialog("check-out-modal", checkOutModalDialog);

function checkOutModalDialog({ apiHost, year, detail, contact }) {
  const onSubmit = async e => {
    const formData = new FormData(e.target);
    const data = {
      admin: contact.email,
      year: formData.get("year"),
      slackID: formData.get("slackID"),
      note: formData.get("note"),
      paid: formData.get("checkOutPaid"),
      amount: formData.get("checkOutTotal")
    };
    try {
      const result = executeCommand(apiHost, Endpoint.attendees, "checkOut", data);
      globalThis.showSnackbar("Check-out uložen");
      return result;
    } catch (err) {
      globalThis.showPersistentSnackbar("Check-out neuložen");
    }
  };
  return html`
    <form method="dialog" @submit="${onSubmit}">
      <input type="hidden" name="year" value="${year}">
      <input type="hidden" name="slackID" value="${detail.slackID}">
      <h2>Check out</h2>
      <fieldset>
        <legend>Vyúčtování</legend>
        <p>
          Účastník by měl za sebe zaplatit, nebo by měl být vyúčtován hromadně.
          V případě, že platba probhla, tak to odškrtněte a zadejte i částku.
        </p>
        <div class="field">
          <label class="checkbox" for="paid"><input
            type="checkbox"
            id="paid"
            name="checkOutPaid"
            value="true">
            <span class="label">Zaplaceno</span></label>
        </div>
        <div class="field">
          <label for="total">Částka</label>
          <input type="text" inputmode="numeric" pattern="[0-9]*"
                 id="total"
                 name="checkOutTotal"
                 value="${detail.nfcTronData?.map(x => x.spent ?? 0)?.reduce((a, b) => a + b, 0) ?? 0}">
        </div>
      </fieldset>
      <fieldset>
        <legend>Další</legend>
        <div class="field">
          <label for="note">Poznámka</label>
          <textarea id="note" name="note"></textarea>
        </div>
      </fieldset>
      <button type="submit" class="hc-button">Odeslat to</button>
    </form>
  `;
}

export function attendeesTemplate(state) {
  const { data, selectedView, detail, year, page, params, selection, isNFCSupported } = state;
  return html`
    ${
    attendeesChips(selectedView, year, {
      [View.attendees]: data?.then(data => data.counts.all),
      [View.hackerAttendees]: data?.then(data => data.counts.hacker),
      [View.volunteerAttendees]: data?.then(data => data.counts.volunteer),
      [View.staffAttendees]: data?.then(data => data.counts.staff),
      [View.crewAttendees]: data?.then(data => data.counts.crew)
    }, params)
  }
    <section class="hc-master-detail">
      <div class="hc-card hc-master-detail__list">
        ${
    until(
      data?.then(data =>
        attendeesTableTemplate(sortBy("paid", data.items), {
          page,
          pages: data.pages,
          total: data.total,
          params,
          selection
        })
      )?.catch(data => {
        if (data.unauthorized) return unauthorized();
      }),
      html`<p style="padding: 16px">Načítám data&hellip;</p>`
    )
  }
      </div>
      ${when(detail, () => attendeeDetailTemplate({ detail, isNFCSupported }))}
    </section>
  `;
}
