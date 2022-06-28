//

async function loadHousingData() {
  const responses = await Promise.all([
    fetch(`/housing/index.json`),
    fetch(`/housing/types.json`),
    fetch(`/housing/variants.json`),
    fetch(`/housing/backstage.json`),
    fetch(`/housing/hackers.json`, {
      // 👆 change to API endpoint when it's ready
      headers: { Accept: "application/json" },
      credentials: "include",
    }),
  ]);
  const [housing, types, variants, backstage, hackers] = await Promise.all(
    responses.map((r) => r.json())
  );

  return { housing, types, variants, hackers, backstage };
}

export function inlineHackerName({ firstName, lastName, company }) {
  if (company) {
    return `${firstName} ${lastName} z ${company}`;
  }
  return `${firstName} ${lastName}`;
}

function renderHousingTypes(
  selectElement,
  { types, formElement, hackerHousing }
) {
  for (const type of types) {
    const option = document.createElement("option");
    option.value = type.name;
    option.selected = type.name === hackerHousing?.type;
    option.textContent = type.title;
    selectElement.appendChild(option);
  }
  selectElement.addEventListener("change", ({ target: { value } }) => {
    for (let section of formElement.querySelectorAll("section")) {
      if (section.classList.contains(`${value}-housing`)) {
        section.setAttribute("aria-hidden", "false");
      } else if (!section.classList.contains("housing-type")) {
        section.setAttribute("aria-hidden", "true");
      }
    }
  });
}

function getHackerSlackProfile() {
  const profile = JSON.parse(localStorage.getItem("slack:profile") || "{}");
  return profile;
}

function renderHousingVariants(
  rootElement,
  { variants, housing, formElement }
) {
  for (const variant of variants) {
    const sectionElement = document.createElement("section");
    sectionElement.classList.add(`${variant.type}-housing`);
    sectionElement.setAttribute("aria-hidden", "true");
    const housingOfVariant = housing.filter(
      (x) => x.type === variant.type && x.variant === variant.name
    );
    sectionElement.innerHTML = `
      <h2>${variant.title}</h2>
      <div class="hc-card">
        <p>${variant.description}</p>
        <div class="rooms" aria-hidden="true">
          ${housingOfVariant
            .map(
              ({ room, capacity }) => `
              <h3>${room}</h3>
              <div class="booking-grid">
              ${Array.from({ length: capacity })
                .map(
                  (_, index) => `
                  <div class="booking-grid__cell">
                    <input
                      list="hackers"
                      name="housing['${room}'][${index}]"
                      placeholder="-- Volno --"
                      type="search"
                    />
                  </div>
                `
                )
                .join("")}
            </div>
          `
            )
            .join("")}
        </div>
        <div class="show-rooms">
          <p><strong>Volných míst: <span class="zimmer-frei">${0}</span></strong></p>
          <a class="hc-link hc-link--decorated" href="#">chci sem</a>
        </div>
      </div>
    `.trim();
    rootElement.appendChild(sectionElement);

    sectionElement
      .querySelector(".show-rooms a")
      .addEventListener("click", (event) => {
        event.preventDefault();
        sectionElement
          .querySelector(".rooms")
          .setAttribute("aria-hidden", "false");
        sectionElement
          .querySelector(".show-rooms")
          .setAttribute("aria-hidden", "true");
        formElement
          .querySelector("button[type=submit]")
          .setAttribute("aria-hidden", "false");
      });
  }
}

function renderHackers(formElement, { hackers, hacker }) {
  const hackersListElement = document.createElement("datalist");
  hackersListElement.id = "hackers";

  for (const { sub, firstName, lastName, company, housing } of hackers) {
    const isHomeless = !housing;
    const inlineValue = inlineHackerName({ firstName, lastName, company });

    if (isHomeless) {
      const option = document.createElement("option");
      option.value = inlineValue;
      option.dataset.id = sub;
      hackersListElement.appendChild(option);
      continue;
    }

    const inputElement = formElement.querySelector(`
      input[name^="housing['${housing}']"]:placeholder-shown,
      [value="${housing}"]
    `);
    inputElement.value = inlineValue;

    if (sub === hacker.sub) {
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
    inputElement.addEventListener("blur", handleInputBlur);
  }

  function handleInputBlur({ target }) {
    if (target.value === "") {
      target.classList.remove("me");
      return;
    }
    const filledHacker = hackersListElement.querySelector(
      `[value="${target.value}"]`
    );

    if (!filledHacker) {
      target.value = "";
      target.classList.remove("me");
    } else {
      filledHacker.remove();
    }
  }
}

function renderBackstage(rootElement, { backstage }) {
  for (let { room, label } of backstage) {
    for (let inputElement of rootElement.querySelectorAll(
      `input[name^="housing['${room}']"]`
    )) {
      inputElement.value = label;
      inputElement.disabled = true;
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

export async function main({ formElement, variantsRootElement }) {
  const selectElement = formElement.elements.type;

  const profile = getHackerSlackProfile();
  const { housing, hackers, types, variants, backstage } =
    await loadHousingData();

  const hacker = hackers.find(({ sub }) => sub === profile.sub);
  const hackerHousing = housing.find(({ room }) => room === hacker.housing);

  renderHousingTypes(selectElement, { types, formElement, hackerHousing });
  renderHousingVariants(variantsRootElement, {
    variants,
    housing,
    formElement,
  });
  selectElement.dispatchEvent(new Event("change"));

  renderHackers(formElement, {
    hackers,
    hacker,
  });
  renderBackstage(formElement, { backstage });
  renderZimmerFrei(variantsRootElement);

  formElement.addEventListener("submit", (event) => {
    event.preventDefault();
    const jsonData = {};
    const formData = new FormData(formElement);

    // collection loop
    for (let [key, value] of formData.entries()) {
      if (key.startsWith("housing") === false) {
        continue;
      }
      const inputedHacker = hackers.find(
        (hacker) => inlineHackerName(hacker) === value
      );
      if (!inputedHacker) {
        continue;
      }
      const [, room] = key.match(/^housing\['(.+)'\]\[(\d+)\]$/);
      jsonData[inputedHacker.sub] = room;
    }

    // This allow you to fillup somebody else to any room but yourself to custom housing variant (your :troll:)
    // and cus this is bellow the collection loop, it will override your previously filled up room (our :troll:)
    if (formData.get("type") === "custom" && formData.get("custom")) {
      jsonData[profile.sub] = formData.get("custom");
    }

    console.info("Sending data to server...", jsonData);
    sendHousingData(jsonData).catch((O_o) => {
      console.error(O_o);
      alert("Něco se pokazilo:" + O_o);
    });
  });

  async function sendHousingData(data) {
    const response = await fetch(formElement.action, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (!response.ok) {
      throw await response.text();
    }
  }
}
