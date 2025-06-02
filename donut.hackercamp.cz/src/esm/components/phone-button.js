import { html, render } from "lit";

function getInternationalPhoneFormat(phone) {
  let number = phone.replace(/\s+/g, "");
  if (number.startsWith("+")) {
    return number;
  }
  return `+420${number}`;
}

export class PhoneButton extends HTMLElement {

  get phone() {
    return this.getAttribute("phone");
  }

  connectedCallback() {
    render(this.render(), this);
  }

  render() {
    if (!this.phone) return null;
    return html`
      <button class="icon-button" href="tel:${getInternationalPhoneFormat(this.phone)}"
              title="Zavolat ${this.phone}" aria-label="Telefon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             class="feather feather-phone">
          <title>Telefon</title>
          <path
            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
      </button>
    `;
  }
}

customElements.define("hc-phone-button", PhoneButton);
