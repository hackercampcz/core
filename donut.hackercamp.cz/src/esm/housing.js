//

async function loadHousingData() {
  const responses = await Promise.all([
    fetch(`/housing/index.json`),
    fetch(`/housing/types.json`),
    fetch(`/housing/variants.json`),
    fetch(`/housing/hackers.json`),
  ]);
  const [housing, types, variants, hackers] = await Promise.all(
    responses.map((r) => r.json())
  );
  return { housing, types, variants, hackers };
}

function renderHousingTypes(
  selectElement,
  { types, formElement, hackerHousing }
) {
  for (const type of types) {
    const option = document.createElement("option");
    option.value = type.name;
    option.selected = type.name === hackerHousing.type;
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

function renderHousingVariants(rootElement, { variants, housing }) {
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
    `.trim();
    rootElement.appendChild(sectionElement);
  }
}

function renderHackers(rootElement, { hackers, hacker }) {
  const hackersList = document.createElement("datalist");
  hackersList.id = "hackers";

  for (const { sub, firstName, lastName, company, housing } of hackers) {
    const isHomeless = !housing;
    const inlineValue = `${firstName} ${lastName} z ${company}`;

    if (isHomeless) {
      const option = document.createElement("option");
      option.value = inlineValue;
      hackersList.appendChild(option);
    } else {
      const inputElement = rootElement.querySelector(`
        input[name^="housing['${housing}']"]:placeholder-shown,
        [value="${housing}"]
      `);
      inputElement.value = inlineValue;

      if (sub === hacker.sub) {
        inputElement.classList.add("me");
      } else {
        inputElement.disabled = true;
      }
    }
  }

  rootElement.appendChild(hackersList);
}

export async function main({ formElement, variantsRootElement }) {
  const selectElement = formElement.elements.type;

  const profile = getHackerSlackProfile();
  const { housing, hackers, types, variants } = await loadHousingData();

  const hacker = hackers.find(({ sub }) => sub === profile.sub);
  const hackerHousing = housing.find(({ room }) => room === hacker.housing);

  renderHousingTypes(selectElement, { types, formElement, hackerHousing });
  renderHousingVariants(variantsRootElement, { variants, housing });
  selectElement.dispatchEvent(new Event("change"));

  renderHackers(formElement, { hackers, hacker });
}
