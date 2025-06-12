import { html, render } from "lit-html";
import { when } from "lit-html/directives/when.js";
import { ticketBadge } from "../lib/attendee.js";

export class SlackAvatar extends HTMLElement {
  static get observedAttributes() {
    return ["name", "src", "size", "badge"];
  }

  get name() {
    return this.getAttribute("name");
  }
  set name(value) {
    this.setAttribute("name", value);
  }

  get src() {
    return this.getAttribute("src");
  }
  set src(value) {
    this.setAttribute("src", value);
  }

  get size() {
    return this.getAttribute("size") ?? "48";
  }
  set size(value) {
    this.setAttribute("size", value);
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
    if (!this.src) return null;
    const image = this.src.replace("_512", `_${this.size}`);
    return html`
      <div class="avatar">
        <img src="${image}" alt="${this.name}">
      </div>
      ${when(this.badge, () => html`<span class="hc-badge">${ticketBadge.get(this.badge)}</span>`)}
    `;
  }
}

customElements.define("hc-slack-avatar", SlackAvatar);
