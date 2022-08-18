/**
 *
 * @param {string} id ID of <dialog> element
 */
export function showModalDialog(id) {
  const element = document.getElementById(id);
  element.showModal();
  element.scrollTo(0, 0);
  document.body.classList.add("has-open-dialog");

  let opened = true;
  const close = () => {
    document.body.classList.remove("has-open-dialog");
    element.close();
    opened = false;
  };

  document.addEventListener("keydown", (event) => {
    if (opened && event.keyCode === 27) {
      close();
    }
  });

  element.addEventListener("click", (event) => {
    if (event.target.name === "close") {
      close();
    }
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
