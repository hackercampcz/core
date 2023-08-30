import { getSlackProfile, setReturnUrl, signOut } from "./lib/profile.js";
import { withAuthHandler } from "./lib/remoting.js";
import * as rollbar from "./lib/rollbar.js";
import { when } from "lit-html/directives/when.js";

async function loadHousingData(apiBase, year) {
  try {
    const params = new URLSearchParams({ year });
    const responses = await Promise.all([
      fetch(`/housing/index.json`),
      fetch(`/housing/types.json`),
      fetch(`/housing/variants.json`),
      fetch(`/housing/backstage.json`),
      withAuthHandler(
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
        }
      ),
    ]);
    const [housing, types, variants, backstage, hackers] = await Promise.all(
      responses.map((resp) => {
        if (!resp.ok) {
          if (resp.status === 401)
            signOut((path) => new URL(path, apiBase).href);
          else throw new Error(`${resp.status}: ${resp.statusText}`);
        }
        return resp.json();
      })
    );
    return { housing, types, variants, hackers, backstage };
  } catch (error) {
    console.error(error);
    alert("Nepodařilo se načíst data o ubytování.");
    return { housing: [], types: [], variants: [], hackers: [], backstage: [] };
  }
}

function inlineHackerName({ name, company }) {
  if (company) {
    return `${name} z ${company}`;
  }
  return name;
}

function renderHousingTypes(selectElement, { types, hacker }) {
  for (const type of types) {
    const option = document.createElement("option");
    option.value = type.name;
    option.selected = type.name === hacker.housing;
    option.textContent = type.title;
    selectElement.appendChild(option);
  }
}

function renderHousingVariants(rootElement, { variants, housing, profile }) {
  for (const variant of variants) {
    const sectionElement = document.createElement("section");
    sectionElement.classList.add(`${variant.type}-housing`);
    sectionElement.setAttribute("aria-hidden", "true");
    const housingOfVariant = housing.filter(
      (x) => x.type === variant.type && x.variant === variant.name
    );
    const [firstPhoto, ...photos] = variant.images;
    sectionElement.innerHTML = `
      <h2>${variant.title}</h2>
      <div class="hc-card">
        <p>${variant.description}</p>
        ${
          (firstPhoto || "") &&
          `
          <div
            class="pswp-gallery pswp-gallery--single-column housing-gallery"
            ${(photos.length > 0 || "") && `data-count="${photos.length}"`}
          >
            <a
              href="${firstPhoto.src}"
              target="_blank"
              data-pswp-width="${firstPhoto.width}"
              data-pswp-height="${firstPhoto.height}"
            >
              <img width="100%" src="${
                firstPhoto.src
              }" alt="Obrázek ubytování" />
            </a>
            ${photos
              .map(
                (photo) => `
                  <a href="${photo.src}"
                    data-pswp-src="${photo.src}"
                    data-pswp-width="${photo.width}"
                    data-pswp-height="${photo.height}"
                    aria-hidden="true"
                  >
                  </a>
                `
              )
              .join("")}
          </div>
        `
        }
        <div class="placements" aria-hidden="true">
          ${housingOfVariant
            .map(
              ({ type, placement, capacity }) => `
              <h3>${placement}</h3>
              <div class="booking-grid">
              ${Array.from({ length: capacity })
                .map(
                  (_, index) => `
                  <div class="booking-grid__cell">
                    <input
                      list="hackers"
                      name="${type}['${placement}'][${index}]"
                      placeholder="-- Volno --"
                      type="search"
                    />

                    ${when(profile.is_admin, () => `
                      <button onclick="
                        event.preventDefault();
                        const input = event.target.previousElementSibling;
                        input.disabled = false;
                      " type="button">
                        unlock
                      </button>
                    `)}
                  </div>
                `
                )
                .join("")}
            </div>
          `
            )
            .join("")}
          <button type="submit" class="hc-button">
            Uložit (se)
          </button>
        </div>
        <div class="show-placements">
          <p><strong>Volných míst: <span class="zimmer-frei">${0}</span></strong></p>
          <a class="hc-link hc-link--decorated" href="#">chci sem</a>
        </div>
      </div>
    `.trim();
    rootElement.appendChild(sectionElement);

    sectionElement
      .querySelector(".show-placements a")
      .addEventListener("click", (event) => {
        event.preventDefault();
        sectionElement
          .querySelector(".placements")
          .setAttribute("aria-hidden", "false");
        sectionElement
          .querySelector(".show-placements")
          .setAttribute("aria-hidden", "true");
      });
  }
}

/**
 * 1. Create <datalist> with all homeless hackers for autocompletion
 * 2. Fill in <input>s with housed hackers
 * 3. Disable other located hackers, but highlight me
 * 4. Once hacker is autocompleted, remove him from <datalist> and vise versa
 * 5. Allow hackers to change housing from custom to specific placement
 */
function renderHackers({ formElement, selectElement }, { hackers, hacker }) {
  const hackersListElement = document.createElement("datalist");
  hackersListElement.id = "hackers";
  const hackersByName = hackers
    .filter((x) => x.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const otherHacker of hackersByName) {
    const { slackID, name, company, housing, housingPlacement } = otherHacker;
    const isHomeless = !housingPlacement;
    const inlineValue = inlineHackerName({ name, company });

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
    }
    // do not disabled custom housing options
    else if (inputElement.type === "search") {
      inputElement.disabled = true;
    }
  }

  formElement.appendChild(hackersListElement);

  for (let inputElement of formElement.querySelectorAll("input[type=search]")) {
    inputElement.addEventListener("focus", handleInputFocus);
    inputElement.addEventListener("blur", handleInputBlur);
  }

  let prevHackerValue;

  function handleInputFocus({ target }) {
    prevHackerValue = target.value;
  }

  function handleInputBlur({ target }) {
    const filledHacker = hackersListElement.querySelector(
      `[value="${target.value}"]`
    );

    // Allow only explicit values that matches any <option> of <datalist>
    if (!filledHacker) {
      target.value = "";
      target.classList.remove("me");
      if (prevHackerValue) {
        const prevHacker = hackers.find(
          (h) => inlineHackerName(h) === prevHackerValue
        );
        if (prevHacker) {
          const option = document.createElement("option");
          option.value = inlineHackerName(prevHacker);
          option.dataset.id = prevHacker.sub;
          hackersListElement.prepend(option);
        }
      }
    }
    // Highlight input with my name and remove it
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
    const myInlinedHackerName = inlineHackerName(hacker);
    if (!hackersListElement.querySelector(`[value="${myInlinedHackerName}"]`)) {
      const option = document.createElement("option");
      option.value = myInlinedHackerName;
      option.dataset.id = hacker.slackID;
      hackersListElement.prepend(option);
    }
  }
}

function renderBackstage(rootElement, { backstage }) {
  for (let { type, placement, label } of backstage) {
    for (let inputElement of rootElement.querySelectorAll(
      `input[name^="${type}['${placement}']"]`
    )) {
      inputElement.value = label;
      inputElement.disabled = true;
      inputElement.parentElement.querySelector("button").remove();
    }
  }
}

function renderZimmerFrei(rootElement) {
  for (let sectionElement of rootElement.querySelectorAll("section")) {
    const counterElement = sectionElement.querySelector(".zimmer-frei");
    const { length: zimmerFrei } = Array.from(
      sectionElement.querySelectorAll("input[type=search]")
    ).filter(({ disabled }) => !disabled);
    counterElement.textContent = zimmerFrei;
  }
}

function autoShowHousingOfMine({ formElement, selectElement }) {
  selectElement.addEventListener("change", ({ target }) => {
    for (let section of formElement.querySelectorAll("section")) {
      if (section.classList.contains(`${target.value}-housing`)) {
        section.setAttribute("aria-hidden", "false");
      } else if (!section.classList.contains("housing-type")) {
        section.setAttribute("aria-hidden", "true");
      }

      const placementsElement = section.querySelector(".placements");
      if (placementsElement) {
        const showRoomsElement = section.querySelector(".show-placements");
        const inputWithMyName = section.querySelector("input.me");

        if (inputWithMyName) {
          placementsElement.setAttribute("aria-hidden", "false");
          showRoomsElement.setAttribute("aria-hidden", "true");
        } else {
          placementsElement.setAttribute("aria-hidden", "true");
          showRoomsElement.setAttribute("aria-hidden", "false");
        }
      }
    }
  });

  selectElement.dispatchEvent(new Event("change"));
}

const HOUSING_INPUT_REGEX = /^(cottage|house|tent)\['(.+)'\]\[(\d+)\]$/;

/**
 *
 * @param {HTMLFormElement} formElement
 */
function handlaFormaSubmita(formElement, { hackers, profile }) {
  formElement.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(formElement);
    const jsonData = {
      year: formData.get("year"),
      items: [],
    };

    for (let [key, value] of formData.entries()) {
      if (HOUSING_INPUT_REGEX.test(key) === false) {
        continue;
      }
      const inputedHacker = hackers.find(
        (hacker) => inlineHackerName(hacker) === value
      );
      if (!inputedHacker) {
        continue;
      }
      const [, housing, housingPlacement] = key.match(HOUSING_INPUT_REGEX);
      jsonData.items.push({
        slackID: inputedHacker.slackID,
        housing,
        housingPlacement,
      });
    }

    // This allow you to fillup somebody else to any placement but yourself to custom housing variant (your :troll:)
    // and cus this is bellow the collection loop, it will override your previously filled up placement (our :troll:)
    if (formData.get("type") === "custom" && formData.get("custom")) {
      jsonData.items = jsonData.items.filter(
        ({ slackID }) => slackID !== profile.sub
      );
      jsonData.items.push({
        slackID: profile.sub,
        housing: formData.get("custom"),
        housingPlacement: "custom",
      });
    }
    sendHousingData(jsonData)
      .then(() => {
        return location.assign("/ubytovani/ulozeno/");
      })
      .catch((O_o) => {
        console.error(O_o);
        alert("Něco se pokazilo:" + O_o);
      });
  });

  async function sendHousingData(data) {
    const body = JSON.stringify(data);
    console.info("Sending housing data to server...", body);
    const response = await withAuthHandler(
      fetch(formElement.action, {
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
            signOut((path) => new URL(path, formElement.action).href);
            reject({ unauthenticated: true });
          });
        },
      }
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
    })
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

export async function main({ formElement, variantsRootElement, env }) {
  rollbar.init(env);

  const selectElement = formElement.elements.type;
  const profile = getSlackProfile();
  const { housing, hackers, types, variants, backstage } =
    await loadHousingData(env["api-host"], env.year);
  const hacker = hackers.find(({ slackID }) => slackID === profile.sub);

  if (!hacker) {
    alert("Nenašlo jsem tě v seznamu hackerů 😭");
  }

  renderHousingTypes(selectElement, {
    types,
    formElement,
    hacker,
  });
  renderHousingVariants(variantsRootElement, {
    variants,
    housing,
    formElement,
    profile,
  });
  renderHackers({ formElement, selectElement }, { hackers, hacker });
  renderBackstage(formElement, { backstage });
  renderZimmerFrei(variantsRootElement);
  autoShowHousingOfMine({ formElement, selectElement });
  handlaFormaSubmita(formElement, { hackers, profile });
  initializeHousingGalleries();
}
