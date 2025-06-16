import { html, render } from "lit-html";
import "./feather-icon.js";

export class MailButton extends HTMLElement {
  static get observedAttributes() {
    return ["email"];
  }

  get email() {
    return this.getAttribute("email");
  }
  set email(value) {
    return this.setAttribute("email", value);
  }

  connectedCallback() {
    render(this.render(), this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    render(this.render(), this);
  }

  render() {
    if (!this.email) return null;
    return html`
      <a class="icon-button small" href="mailto:${this.email}"
         title="Napsat ${this.email}" aria-label="E-mail"
         @click="${e => e.stopPropagation()}">
        <feather-icon name="mail" title="E-mail"></feather-icon>
      </a>
    `;
  }
}

customElements.define("hc-mail-button", MailButton);
