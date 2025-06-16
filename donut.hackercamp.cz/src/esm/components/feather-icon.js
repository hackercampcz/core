import { render, svg } from "lit-html";

export class FeatherIcon extends HTMLElement {
  get name() {
    return this.getAttribute("name");
  }
  set name(value) {
    this.setAttribute("name", value);
  }

  get title() {
    return this.getAttribute("title");
  }
  set title(value) {
    this.setAttribute("title", value);
  }

  connectedCallback() {
    render(this.render(), this);
  }

  render() {
    const classes = `feather feather-${this.name}`;
    return svg`
      <svg class="${classes}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <title>${this.title}</title>
        <use href="#${this.name}"/>
      </svg>
    `;
  }
}

customElements.define("feather-icon", FeatherIcon);
