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

function renderHousingTypes(selectElement, { types, formElement }) {
  for (const type of types) {
    const option = document.createElement("option");
    option.value = type.name;
    option.textContent = type.title;
    selectElement.appendChild(option);
  }
  selectElement.addEventListener("change", (event) => {
    const { value } = event.target;

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

function renderHousing() {
  // TODO
  `
    <h3>Stan č. 1</h3>
    <div class="booking-grid">
      <div class="booking-grid__cell">
        <input list="hackers" name="glamping[]" placeholder="-- Volno --" />
      </div>
      <div class="booking-grid__cell">
        <input list="hackers" name="glamping[]" placeholder="-- Volno --"  />
      </div>
      <div class="booking-grid__cell">
        <input list="hackers" name="glamping[]" placeholder="-- Volno --"  />
      </div>
      <div class="booking-grid__cell">
        <input list="hackers" name="glamping[]" placeholder="-- Volno --"  />
      </div>
      <div class="booking-grid__cell">
        <input list="hackers" name="glamping[]" placeholder="-- Volno --"  />
      </div>
      <div class="booking-grid__cell">
        <input list="hackers" name="glamping[]" placeholder="-- Volno --"  />
      </div>
    </div>
  `;
}

function renderHousingVariants(rootElement, { variants, housing }) {
  for (const variant of variants) {
    const sectionElement = document.createElement("section");
    sectionElement.classList.add(`${variant.type}-housing`);
    sectionElement.setAttribute("aria-hidden", "true");
    sectionElement.innerHTML = `
      <h2>${variant.title}</h2>
      <div class="hc-card">
        <p>${variant.description}</p>
        ${/* TODO render inputs */}
      </div>
    `.trim();
    rootElement.appendChild(sectionElement);
  }
}

export async function main({ formElement, variantsRootElement }) {
  const selectElement = formElement.elements.type;

  const profile = getHackerSlackProfile();
  const { housing, hackers, types, variants } = await loadHousingData();

  renderHousingTypes(selectElement, { types, formElement });
  renderHousingVariants(variantsRootElement, { variants, housing });

  const hacker = hackers.find(({ sub }) => sub === profile.sub);

  {
    if (hacker?.housing?.type) {
      selectElement.value = hacker.housing.type;
    }
    selectElement.dispatchEvent(new Event("change"));
  }

  // loop over housing to render options
  for (let { type, sign, capacity, color } of housing) {
    console.log({ type, sign, capacity, color });
  }
}
