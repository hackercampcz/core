import "@material/web/iconbutton/standard-icon-button.js";
import { LitElement, html } from "lit";

export class MailButton extends LitElement {
  static properties = {
    email: {},
  };
  render() {
    if (!this.email) return null;
    return html`<md-standard-icon-button
      href="mailto:${this.email}"
      title="Napsat ${this.email}"
      >mail</md-standard-icon-button
    >`;
  }
}

customElements.define("hc-mail-button", MailButton);
