import { html, svg } from "lit-html";

export const housing = new Map([
  ["own-car", "Přijede autem a bude v něm i spát"],
  ["own-caravan", "Přiveze si vlastní karavan, ve kterém chce spát"],
  ["open-air", "Bude spát pod širákem nebo v hamace"],
  ["own-tent", "Bude spát ve stanu"],
  ["tent", "Bude spát v Glamping stanu"],
  ["glamping", "Bude spát v Glamping stanu"],
  ["cottage", "Bude spát v chatce"],
  ["house", "Bude spát v domečku"],
  ["nearby", "Využije možnost ubytování v okolí"]
]);

export const travel = new Map([
  ["full-car", "Přijede autem a jsou full"],
  ["free-car", "Přijede autem a nabídne spolujízdu"],
  ["carpool", "S někým  se sveze"],
  ["bus", "Chce jet Hacker busem z Brna a okolí!"],
  ["no-car", "Nejede autem (využije bus, vlak, kolo, pěškobus)"],
  ["no-car-but-info", "Nejedu autem, ale zajímá ho shuttlebus"]
]);

export const ticketBadge = new Map([
  [
    "nonprofit",
    svg`
      <svg
        class="hc-price-list__badge"
        width="24"
        height="24"
        viewBox="0 0 66 66"
        fill="none"
         xmlns="http://www.w3.org/2000/svg">
        <title>Táborník z neziskovky</title>
        <g clip-path="url(#item1_clip0)">
          <rect width="66" height="66" rx="20" fill="url(#paint5_linear)" />
          <circle opacity="0.23" cx="52" cy="11" r="17" fill="white" />
          <circle opacity="0.23" cx="11" cy="55" r="24" fill="white" />
        </g>
        <defs>
          <linearGradient
            id="paint5_linear"
            x1="2.55465e-06"
            y1="-8"
            x2="66"
            y2="73.5"
            gradientUnits="userSpaceOnUse">
            <stop stop-color="#E0E0E0" />
            <stop offset="1" stop-color="#BEBEBE" />
          </linearGradient>
          <clipPath id="item1_clip0">
            <rect width="66" height="66" rx="20" fill="white" />
          </clipPath>
        </defs>
      </svg>
    `
  ],
  [
    "hacker",
    svg`
      <svg
        class="hc-price-list__badge"
        width="24"
        height="24"
        viewBox="0 0 66 66"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <title>Hacker</title>
        <g clip-path="url(#item2_clip0)">
          <rect width="66" height="66" rx="20" fill="url(#paint6_linear)" />
          <circle opacity="0.23" cx="52" cy="11" r="17" fill="url(#paint1_linear)" />
          <circle opacity="0.23" cx="11" cy="55" r="24" fill="url(#paint2_linear)" />
        </g>
        <defs>
          <linearGradient id="paint6_linear" x1="2.55465e-06" y1="-8" x2="66" y2="73.5"
                          gradientUnits="userSpaceOnUse">
            <stop stop-color="#E0E0E0" />
            <stop offset="1" stop-color="#BEBEBE" />
          </linearGradient>
          <linearGradient id="paint1_linear" x1="33.0682" y1="21.0455" x2="85.2184" y2="11.0029"
                          gradientUnits="userSpaceOnUse">
            <stop stop-color="#EE771B" />
            <stop offset="0.4271" stop-color="#E62271" />
            <stop offset="0.7889" stop-color="#684997" />
            <stop offset="1" stop-color="#3E7ABC" />
          </linearGradient>
          <linearGradient id="paint2_linear" x1="-15.7273" y1="69.1818" x2="57.8966" y2="55.0041"
                          gradientUnits="userSpaceOnUse">
            <stop stop-color="#EE771B" />
            <stop offset="0.4271" stop-color="#E62271" />
            <stop offset="0.7889" stop-color="#684997" />
            <stop offset="1" stop-color="#3E7ABC" />
          </linearGradient>
          <clipPath id="item2_clip0">
            <rect width="66" height="66" rx="20" fill="white" />
          </clipPath>
        </defs>
      </svg>
    `
  ],
  [
    "hacker-plus",
    svg`
      <svg
        class="hc-price-list__badge"
        width="24" height="24" viewBox="0 0 66 66" fill="none" xmlns="http://www.w3.org/2000/svg">
        <title>Hacker filantrop</title>
        <g clip-path="url(#item3_clip0)">
          <rect width="66" height="66" rx="20" fill="url(#paint3_linear)" />
          <circle opacity="0.23" cx="52" cy="11" r="17" fill="white" />
          <circle opacity="0.23" cx="11" cy="55" r="24" fill="white" />
        </g>
        <defs>
          <linearGradient id="paint3_linear" x1="-3.75" y1="52.5" x2="97.4828" y2="33.0057"
                          gradientUnits="userSpaceOnUse">
            <stop stop-color="#EE771B" />
            <stop offset="0.4271" stop-color="#E62271" />
            <stop offset="0.7889" stop-color="#684997" />
            <stop offset="1" stop-color="#3E7ABC" />
          </linearGradient>
          <clipPath id="item3_clip0">
            <rect width="66" height="66" rx="20" fill="white" />
          </clipPath>
        </defs>
      </svg>
    `
  ],
  [
    "hacker-patron",
    svg`
      <svg
        class="hc-price-list__badge"
        width="24" height="24" viewBox="0 0 66 66" fill="none" xmlns="http://www.w3.org/2000/svg">
        <title>Patron Campu</title>
        <g clip-path="url(#item4_clip0)">
          <rect width="66" height="66" rx="20" fill="url(#paint10_linear)" />
          <circle opacity="0.23" cx="52" cy="11" r="17" fill="white" />
          <circle opacity="0.23" cx="11" cy="55" r="24" fill="white" />
        </g>
        <defs>
          <linearGradient id="paint10_linear" x1="-3.75" y1="52.5" x2="97.4828" y2="33.0057"
                          gradientUnits="userSpaceOnUse">
            <stop stop-color="#FDF59A" />
            <stop offset="0.498264" stop-color="#F1CF5D" />
            <stop offset="1" stop-color="#E1BB49" />
          </linearGradient>
          <clipPath id="item4_clip0">
            <rect width="66" height="66" rx="20" fill="white" />
          </clipPath>
        </defs>
      </svg>
    `
  ],
  [
    "crew",
    html`<img
      class="hc-price-list__badge"
      width="24"
      height="24"
      style="padding-left: 16px"
      src="data:image/png;base64,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"
      alt="Crew">`
  ],
  ["volunteer", html``],
  ["staff", html``]
]);
