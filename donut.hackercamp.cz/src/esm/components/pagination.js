import { html, render } from "lit-html";

export class Pagination extends HTMLElement {
  connectedCallback() {
    render(this.render(), this);
  }

  get page() {
    return parseInt(this.getAttribute("page") ?? "0");
  }
  get pageSize() {
    return parseInt(this.getAttribute("page-size") ?? "20");
  }
  get pages() {
    return parseInt(this.getAttribute("pages") ?? "0");
  }
  get count() {
    return parseInt(this.getAttribute("count") ?? "0");
  }
  get total() {
    return parseInt(this.getAttribute("total") ?? "0");
  }
  get params() {
    return Object.fromEntries(new URLSearchParams(this.getAttribute("params")));
  }

  search(p) {
    return new URLSearchParams(Object.assign({}, this.params, p));
  }

  render() {
    const offset = this.page * this.pageSize;
    const first = offset + 1;
    const last = offset + this.count;
    this.classList.add("hc-pagination");
    return html`
      <data class="hc-pagination__total" value="${this.total}">${first}-${last} ze ${this.total}</data>
      <a class="icon-button small"
         title="První strana"
         href="?${this.search({ page: 0 })}"
         ?disabled="${this.page <= 0}">
        <feather-icon name="skip-back" title="První"></feather-icon>
      </a>
      <a class="icon-button small"
         title="Předchozí strana"
         href="?${this.search({ page: Math.max(this.page - 1, 0) })}"
         ?disabled="${this.page <= 0}">
        <feather-icon name="chevron-left" title="Předchozí"></feather-icon>
      </a>
      <a class="icon-button small"
         title="Další strana"
         href="?${this.search({ page: Math.min(this.page + 1, this.pages - 1) })}"
         ?disabled="${this.page >= (this.pages - 1)}">
        <feather-icon name="chevron-right" title="Další"></feather-icon>
      </a>
      <a class="icon-button small"
         title="Poslední strana"
         href="?${this.search({ page: this.pages - 1 })}"
         ?disabled="${this.page >= (this.pages - 1)}">
        <feather-icon name="skip-forward" title="Poslední"></feather-icon>
      </a>
    `;
  }
}

customElements.define("hc-pagination", Pagination);
