import "@material/web/iconbutton/standard-icon-button.js";
import { html, LitElement } from "lit";

function getInternationalPhoneFormat(phone) {
  let internationalNr = phone.replace(/\s+/g, "");
  if (internationalNr.startsWith("+")) {
    return internationalNr;
  }
  return `+420${internationalNr}`;
}

export class PhoneButton extends LitElement {
  static properties = {
    phone: {},
  };
  render() {
    if (!this.phone) return null;
    return html`<md-standard-icon-button
      href="tel:${getInternationalPhoneFormat(this.phone)}"
      title="Zavolat ${this.phone}"
      >call</md-standard-icon-button
    >`;
  }
}

customElements.define("hc-phone-button", PhoneButton);
