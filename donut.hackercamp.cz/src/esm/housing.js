import { getContact, getSlackProfile, setReturnUrl, signOut } from "./lib/profile.js";
import { withAuthHandler } from "./lib/remoting.js";
import * as rollbar from "./lib/rollbar.js";

async function loadHousingData(apiBase, year) {
  try {
    const params = new URLSearchParams({ year });
    const resp = await withAuthHandler(
      fetch(new URL(`housing?${params}`, apiBase).href, {
        headers: { Accept: "application/json" },
        credentials: "include",
      }),
      {
        onUnauthenticated() {
          setReturnUrl(location.href);
          return new Promise((resolve, reject) => {
            signOut((path) => new URL(path, apiBase).href);
            reject({ unauthenticated: true });
          });
        },
      },
    );
    const hackers = await resp.json();
    return { hackers };
  } catch (err) {
    rollbar.error(err);
    alert("Nepodařilo se načíst data o ubytování.");
    return { hackers: [] };
  }
}

function formatHackerName({ name, company }) {
  if (company) {
    return `${name} z ${company}`;
  }
  return name;
}

function handleUnlock(e) {
  e.preventDefault();
  e.target.previousElementSibling.disabled = false;
}

function handlePlacementSelection(e) {
  e.preventDefault();
  const form = e.target.form;
  const section = e.target.parentElement.parentElement.parentElement;
  form.querySelectorAll(`.${section.className} .placements`).forEach(el => {
    el.ariaHidden = "true";
  });
  form.querySelectorAll(`.${section.className} .show-placements`).forEach(el => {
    el.ariaHidden = "false";
  });
  section.querySelector(".placements").ariaHidden = "false";
  section.querySelector(".show-placements").ariaHidden = "true";
}

function initHousingVariants(formElement, { variants, profile }) {
  for (const variant of variants) {
    for (const section of formElement.querySelectorAll(`.${variant.type}-housing`)) {
      for (const cell of section.querySelectorAll(".booking-grid__cell")) {
        const btn = cell.querySelector("button.unlock");
        if (!btn) continue;
        if (profile.is_admin) {
          btn.disabled = false;
        } else {
          btn.remove();
        }
      }
    }
  }
  formElement.addEventListener("click", (e) => {
    if (e.target.classList.contains("unlock")) {
      handleUnlock(e);
    } else if (e.target.classList.contains("placement-selection")) {
      handlePlacementSelection(e);
    }
  });
}

/**
 * 1. Fill <datalist> with all homeless hackers for autocompletion
 * 2. Fill in <input>s with housed hackers
 * 3. Disable other located hackers, but highlight me
 * 4. Once a hacker is autocompleted, remove him from <datalist> and vice versa
 * 5. Allow hackers to change housing from custom to specific placement
 */
function renderHackers(formElement, { hackers, hacker }) {
  const selectElement = formElement.elements.type;
  selectElement.querySelector(`option[value="${hacker.housing}"]`)?.setAttribute("selected", "selected");

  const hackersListElement = formElement.querySelector("#hackers");
  const hackersByName = hackers
    .filter((x) => x.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const otherHacker of hackersByName) {
    const { slackID, name, company, housing, housingPlacement } = otherHacker;
    const isHomeless = !housingPlacement;
    const inlineValue = formatHackerName({ name, company });

    if (isHomeless) {
      const option = document.createElement("option");
      option.value = inlineValue;
      option.dataset.id = slackID;
      if (slackID === hacker.slackID) {
        hackersListElement.prepend(option);
      } else {
        hackersListElement.appendChild(option);
      }
      continue;
    }

    const inputElement = formElement.querySelector(`
      input[name^="${housing}['${housingPlacement}']"]:placeholder-shown,
      input[name="${housingPlacement}"][value="${housing}"]
    `);

    if (!inputElement) continue;

    if (["search", "text"].includes(inputElement.type)) {
      inputElement.value = inlineValue;
    }

    if (slackID === hacker.slackID) {
      inputElement.classList.add("me");
      if (inputElement.name === "custom") {
        inputElement.checked = true;
      }
    } // do not disabled custom housing options
    else if (inputElement.type === "search") {
      inputElement.disabled = true;
    }
  }

  for (const input of formElement.querySelectorAll("input[type=search]")) {
    input.addEventListener("focus", handleInputFocus);
    input.addEventListener("blur", handleInputBlur);
  }

  let prevHackerValue;

  function handleInputFocus({ target }) {
    prevHackerValue = target.value;
  }

  function handleInputBlur({ target }) {
    const filledHacker = hackersListElement.querySelector(
      `[value="${target.value}"]`,
    );

    // Allow only explicit values that matches any <option> of <datalist>
    if (!filledHacker) {
      target.value = "";
      target.classList.remove("me");
      if (prevHackerValue) {
        const prevHacker = hackers.find(
          (h) => formatHackerName(h) === prevHackerValue,
        );
        if (prevHacker) {
          const option = document.createElement("option");
          option.value = formatHackerName(prevHacker);
          option.dataset.id = prevHacker.sub;
          hackersListElement.prepend(option);
        }
      }
    } // Highlight input with my name and remove it
    //  from <datalist> to not be autocompleted anymore
    else {
      if (filledHacker.dataset.id === hacker.slackID) {
        target.classList.add("me");
      }
      filledHacker.remove();
    }
  }

  selectElement.addEventListener("change", handleSelectChange);

  // Append back my inlined name to <datalist> when housing type
  //  changed from custom AND there is no search input with my name yet
  function handleSelectChange({ target }) {
    if (target.value === "custom") return;
    const myInlinedHackerName = formatHackerName(hacker);
    if (!hackersListElement.querySelector(`[value="${myInlinedHackerName}"]`)) {
      const option = document.createElement("option");
      option.value = myInlinedHackerName;
      option.dataset.id = hacker.slackID;
      hackersListElement.prepend(option);
    }
  }
}

function renderReservations(rootElement, { reservations }) {
  for (const { type, placement, label } of reservations) {
    for (const input of rootElement.querySelectorAll(`input[name^="${type}['${placement}']"]`)) {
      input.value = label;
      input.disabled = true;
      input.parentElement?.querySelector("button")?.remove();
    }
  }
}

function renderFreeCapacity(rootElement) {
  for (const sectionElement of rootElement.querySelectorAll("section:has(.free-capacity)")) {
    const capacity = sectionElement.querySelector(".free-capacity");
    const { length: freeCapacity } = sectionElement.querySelectorAll("input[type=search]:enabled");
    capacity.textContent = freeCapacity;
    capacity.value = freeCapacity;
  }
}

function autoShowHousingOfMine(formElement) {
  const selectElement = formElement.elements.type;
  selectElement.addEventListener("change", ({ target }) => {
    for (const section of formElement.querySelectorAll("section")) {
      if (section.classList.contains(`${target.value}-housing`)) {
        section.ariaHidden = "false";
      } else if (!section.classList.contains("housing-type")) {
        section.ariaHidden = "true";
      }

      const placementsElement = section.querySelector(".placements");
      if (placementsElement) {
        const showRoomsElement = section.querySelector(".show-placements");
        const inputWithMyName = section.querySelector("input.me");

        if (inputWithMyName) {
          placementsElement.ariaHidden = "false";
          showRoomsElement.ariaHidden = "true";
        } else {
          placementsElement.ariaHidden = "true";
          showRoomsElement.ariaHidden = "false";
        }
      }
    }
  });

  selectElement.dispatchEvent(new Event("change"));
}

const HOUSING_INPUT_REGEX = /^(cottage|house|tent)\['(.+)'\]\[(\d+)\]$/;

/**
 * @param {HTMLFormElement} formElement
 */
function handlaFormaSubmita(formElement, { hackers, profile }) {
  formElement.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(formElement);
    const jsonData = {
      year: formData.get("year"),
      items: [],
    };

    for (const [key, value] of formData) {
      if (!HOUSING_INPUT_REGEX.test(key)) continue;
      const inputedHacker = hackers.find((hacker) => formatHackerName(hacker) === value);
      if (!inputedHacker) continue;
      const [, housing, housingPlacement] = key.match(HOUSING_INPUT_REGEX);
      jsonData.items.push({
        slackID: inputedHacker.slackID,
        housing,
        housingPlacement,
      });
    }

    // This allows you to fill somebody else to any placement but yourself to custom housing variant (your :troll:)
    // and because this is bellow the collection loop, it will override your previously filled up placement (our :troll:)
    if (formData.get("type") === "custom" && formData.get("custom")) {
      jsonData.items = jsonData.items.filter(
        ({ slackID }) => slackID !== profile.sub,
      );
      jsonData.items.push({
        slackID: profile.sub,
        housing: formData.get("custom"),
        housingPlacement: "custom",
      });
    }
    sendHousingData(formElement.action, jsonData)
      .then(() => location.assign("/ubytovani/ulozeno/"))
      .catch((err) => {
        rollbar.error(err);
        alert("Něco se pokazilo:" + err);
      });
  });

  async function sendHousingData(url, data) {
    const body = JSON.stringify(data);
    console.info("Sending housing data to server...", body);
    const response = await withAuthHandler(
      fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body,
        referrerPolicy: "no-referrer",
      }),
      {
        onUnauthenticated() {
          setReturnUrl(location.href);
          return new Promise((resolve, reject) => {
            signOut((path) => new URL(path, url).href);
            reject({ unauthenticated: true });
          });
        },
      },
    );
    if (!response.ok) {
      throw await response.text();
    }
  }
}

async function initializeHousingGalleries() {
  const { default: PhotoSwipeLightbox } = await import(
    "https://unpkg.com/photoswipe/dist/photoswipe-lightbox.esm.js"
  );

  document.head.appendChild(
    el("link", {
      rel: "stylesheet",
      href: "https://unpkg.com/photoswipe@5.2.2/dist/photoswipe.css",
    }),
  );
  const lightbox = new PhotoSwipeLightbox({
    gallery: ".housing-gallery",
    children: "a",
    pswpModule: () => import("https://unpkg.com/photoswipe"),
  });
  lightbox.init();

  function el(tagName, attrs) {
    const el = document.createElement(tagName);
    for (const [key, val] of Object.entries(attrs)) el.setAttribute(key, val);
    return el;
  }
}

export async function main(
  { formElement, env, housing: { reservations, variants } },
) {
  rollbar.init(env);
  try {
    const profile = getSlackProfile();
    const contact = getContact();
    rollbar.info("Housing profile", { profile, contact });
    initHousingVariants(formElement, { variants, profile });

    const { hackers } = await loadHousingData(env["api-host"], env.year);
    const hacker = hackers.find(({ slackID }) => slackID === profile.sub);
    if (!hacker) {
      alert("Nenašlo jsem tě v seznamu hackerů 😭");
    }
    renderHackers(formElement, { hackers, hacker });
    renderReservations(formElement, { reservations });
    renderFreeCapacity(formElement);
    autoShowHousingOfMine(formElement);
    handlaFormaSubmita(formElement, { hackers, profile });
    await initializeHousingGalleries();
  } catch (err) {
    rollbar.error(err);
  }
}
