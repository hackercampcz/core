//
export function main({ formElement, sectionElements }) {
  formElement.elements.type.addEventListener("change", (event) => {
    const { value } = event.target;
    for (let sectionElm of sectionElements) {
      if (Array.from(sectionElm.classList).includes(`${value}-housing`)) {
        sectionElm.removeAttribute("aria-hidden");
      } else {
        sectionElm.setAttribute("aria-hidden", "true");
      }
    }
  });

  setTimeout(() => {
    const selectElm = formElement.elements.type;
    selectElm.value = "glamping";
    selectElm.dispatchEvent(new Event("change"));
  }, 200);
}
