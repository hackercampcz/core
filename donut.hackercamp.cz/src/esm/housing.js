//

async function loadHousingData() {
  const responses = await Promise.all([
    fetch(`/housing/index.json`),
    fetch(`/housing/hackers.json`),
  ]);
  const [housing, hackers] = await Promise.all(responses.map((r) => r.json()));
  return { housing, hackers };
}

function watchHousingTypeSwitch({ selectElement, sectionElements }) {
  selectElement.addEventListener("change", (event) => {
    const { value } = event.target;
    for (let sectionElm of sectionElements) {
      if (Array.from(sectionElm.classList).includes(`${value}-housing`)) {
        sectionElm.removeAttribute("aria-hidden");
      } else {
        sectionElm.setAttribute("aria-hidden", "true");
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

export async function main({ formElement, sectionElements }) {
  const selectElement = formElement.elements.type;
  watchHousingTypeSwitch({ selectElement, sectionElements });

  const { housing, hackers } = await loadHousingData();
  const profile = getHackerSlackProfile();
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
