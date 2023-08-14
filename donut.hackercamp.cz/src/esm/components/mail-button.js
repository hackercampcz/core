import "@material/web/iconbutton/icon-button.js";
import "@material/web/icon/icon.js";
import { LitElement, html } from "lit";

export class MailButton extends LitElement {
  static properties = {
    email: {},
  };
  render() {
    if (!this.email) return null;
    return html`<md-icon-button
      href="mailto:${this.email}"
      title="Napsat ${this.email}"
    >
      <md-icon>mail</md-icon>
    </md-icon-button>`;
  }
}

customElements.define("hc-mail-button", MailButton);
