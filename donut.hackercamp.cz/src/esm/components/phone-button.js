import { html, render } from "lit-html";
import "./feather-icon.js";

function getInternationalPhoneFormat(phone) {
  const number = phone.replace(/\s+/g, "");
  if (number.startsWith("+")) {
    return number;
  }
  return `+420${number}`;
}

export class PhoneButton extends HTMLElement {
  static get observedAttributes() {
    return ["phone"];
  }

  get phone() {
    return this.getAttribute("phone");
  }
  set phone(value) {
    this.setAttribute("phone", value);
  }

  connectedCallback() {
    render(this.render(), this);
  }

  render() {
    if (!this.phone) return null;
    return html`
      <a class="icon-button small" href="tel:${getInternationalPhoneFormat(this.phone)}"
         title="Zavolat ${this.phone}" aria-label="Telefon"
         @click="${e => e.stopPropagation()}">
        <feather-icon name="phone" title="Telefon"></feather-icon>
      </a>
    `;
  }
}

customElements.define("hc-phone-button", PhoneButton);
