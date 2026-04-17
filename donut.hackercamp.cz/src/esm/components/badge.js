import { ticketName } from "@hackercamp/lib/ticket.js";
import { html, render } from "lit-html";
import { ticketBadge } from "../lib/attendee.js";

export class Badge extends HTMLElement {
  static get observedAttributes() {
    return ["badge"];
  }

  get badge() {
    return this.getAttribute("badge");
  }
  set badge(value) {
    this.setAttribute("badge", value);
  }

  connectedCallback() {
    render(this.render(), this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    render(this.render(), this);
  }

  render() {
    if (!this.badge) return null;
    return html`<i class="hc-badge" title="${ticketName.get(this.badge)}">${ticketBadge.get(this.badge)}</i>`;
  }
}

customElements.define("hc-badge", Badge);
