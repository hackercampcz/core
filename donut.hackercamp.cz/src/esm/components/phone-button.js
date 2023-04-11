import "@material/web/iconbutton/standard-icon-button.js";
import { LitElement, html } from "lit";

export class PhoneButton extends LitElement {
  static properties = {
    phone: {},
  };
  render() {
    if (!this.phone) return null;
    return html`<md-standard-icon-button
      href="tel:${this.phone.replace(/\w+/g, "")}"
      title="Zavolat ${this.phone}"
      >call</md-standard-icon-button
    >`;
  }
}

customElements.define("hc-phone-button", PhoneButton);
