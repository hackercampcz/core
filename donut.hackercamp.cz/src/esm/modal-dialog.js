/**
 *
 * @param {string} id ID of <dialog> element
 */
export function showModalDialog(id) {
  const element = document.getElementById(id);
  element.showModal();
  element.scrollTo(0, 0);
  document.body.classList.add("has-open-dialog");
  element.querySelector("button[name=close]")?.addEventListener("click", () => {
    document.body.classList.remove("has-open-dialog");
    element.close();
  });
}

export function registerOpenModalListeners(selector) {
  const elements = document.querySelectorAll(selector);
  for (const element of elements) {
    element.addEventListener("click", () => {
      const modalId = element.href?.split("#")[1] || element.dataset.modalId;
      showModalDialog(modalId);
    });
  }
}
