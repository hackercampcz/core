import "@material/web/iconbutton/icon-button.js";
import "@material/web/icon/icon.js";
import { html, LitElement } from "lit";

function getInternationalPhoneFormat(phone) {
  let internationalNr = phone.replace(/\s+/g, "");
  if (internationalNr.startsWith("+")) {
    return internationalNr;
  }
  return `+420${internationalNr}`;
}

export class PhoneButton extends LitElement {
  static properties = { phone: {} };

  render() {
    if (!this.phone) return null;
    return html`<md-icon-button
      href="tel:${getInternationalPhoneFormat(this.phone)}"
      title="Zavolat ${this.phone}"
    >
      <md-icon>call</md-icon>
    </md-icon-button>`;
  }
}

customElements.define("hc-phone-button", PhoneButton);
