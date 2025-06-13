import { svg } from "lit-html";

export function iconBack(title = "Zpět") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         class="feather feather-arrow-left">
      <title>${title}</title>
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  `;
}

export function iconUserCheck(title = "Check In") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         class="feather feather-user-check">
      <title>${title}</title>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <polyline points="17 11 19 13 23 9"/>
    </svg>
  `;
}

export function iconUserX(title = "Check Out") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         class="feather feather-user-x">
      <title>${title}</title>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="18" y1="8" x2="23" y2="13"/>
      <line x1="23" y1="8" x2="18" y2="13"/>
    </svg>
  `;
}

export function iconCheckSquare(title = "Hotovo") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-check-square">
      <title>${title}</title>
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  `;
}

export function iconChevronLeft(title = "Předchozí") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-left">
      <title>${title}</title>
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  `;
}

export function iconChevronRight(title = "Další") {
  return svg `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right">
      <title>${title}</title>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  `;
}

export function iconContactless() {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
      <title>Contactless</title>
      <path
        d="M332.92-387.08q7.46-21.31 11.81-44.73 4.35-23.42 4.35-48.19 0-24.77-4.35-48.19-4.35-23.42-11.81-44.73l-55.53 23.07q4.84 16.47 8.26 34.12 3.43 17.65 3.43 35.73t-3.43 35.73q-3.42 17.65-8.26 34.12l55.53 23.07Zm128.77 54q14.55-34.89 20.97-71.61 6.42-36.73 6.42-75.29 0-38.56-6.42-75.3-6.42-36.74-20.97-71.64l-55.53 22.31q12.07 28.84 17.49 60.19 5.43 31.34 5.43 64.42t-5.43 64.42q-5.42 31.35-17.49 60.19l55.53 22.31Zm130 54q18.69-47.06 28.04-97.41 9.35-50.36 9.35-103.51 0-53.15-9.35-103.51-9.35-50.35-28.04-97.41l-55.53 24.31q16.46 40.73 24.69 85.35 8.23 44.61 8.23 91.17 0 46.55-8.23 91.23-8.23 44.68-24.69 85.47l55.53 24.31ZM480.07-100q-78.84 0-148.21-29.92t-120.68-81.21q-51.31-51.29-81.25-120.63Q100-401.1 100-479.93q0-78.84 29.92-148.21t81.21-120.68q51.29-51.31 120.63-81.25Q401.1-860 479.93-860q78.84 0 148.21 29.92t120.68 81.21q51.31 51.29 81.25 120.63Q860-558.9 860-480.07q0 78.84-29.92 148.21t-81.21 120.68q-51.29 51.31-120.63 81.25Q558.9-100 480.07-100Zm-.07-60q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
    </svg>
  `;
}

export function iconCopy(title = "Kopírovat") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         class="feather feather-copy">
      <title>${title}</title>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  `;
}

export function iconDownload(title = "Stáhnout") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         class="feather feather-download">
      <title>${title}</title>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  `;
}

export function iconEdit(title = "Upravit") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         class="feather feather-edit">
      <title>${title}</title>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  `;
}

export function iconFakturoid() {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 192 192">
      <title>Vyfakturovat</title>
      <g fill="none" fill-rule="evenodd">
        <path fill="light-dark(#fff, #000)" d="M38 35h121v120H38z"/>
        <path fill="currentColor"
              d="M112 122.074c0 6.222 4.938 9.926 13.506 9.926 8.426 0 12.494-4.148 12.494-12.298V112h-6.971c-14.82 0-19.029 3.552-19.029 10.074"/>
        <path fill="currentColor"
              d="M96.005 14C49.061 14 11 44.178 11 81.406v30.183C11 148.817 49.061 179 96.005 179 142.948 179 181 148.817 181 111.59V81.405C181 44.178 142.948 14 96.005 14zm-27.593 99.863h-8.417v32.659h-7.832c-6.243 0-11.757-4.776-11.757-11.58V83.356c0-15.923 7.403-35.862 29.64-40.8 22.51-4.998 28.805 6.002 28.805 6.002s-14.084-.192-25.119 8.413C67.45 61.87 60.215 72.67 59.995 84.952v15.171c13.895 2.66 25.018-1.954 28.3-3.412l.562-.07s-.996 17.222-20.445 17.222zm86.929 6.03c0 16.499-12.186 27.93-29.6 27.93h-3.919c-18.573 0-31.344-10.418-31.344-24.746 0-13.892 10.158-24.456 38.891-24.456h6.818v-1.016c0-10.998-5.223-18.814-16.834-18.814-14.074 0-21.907 5.354-24.812 8.973h-.724v-6.222c0-8.684 7.837-19.101 28.44-19.101 17.414 0 33.084 12.59 33.084 39.505v17.946z"/>
      </g>
    </svg>
  `;
}

export function iconLogIn(title = "Přihlásit se") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-log-in">
      <title>${title}</title>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/>
      <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  `;
}

export function iconLogOut(title = "Odhlásit se") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-log-out">
      <title>${title}</title>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  `;
}

export function iconRefreshCcw(title = "Obnovit") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-refresh-ccw">
      <title>${title}</title>
      <polyline points="1 4 1 10 7 10"/>
      <polyline points="23 20 23 14 17 14"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
    </svg>
  `;
}

export function iconRemove(title = "Smazat") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         class="feather feather-trash-2">
      <title>${title}</title>
      <polyline points="3 6 5 6 21 6"/>
      <path
        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  `;
}

export function iconSearch(title = "Hledat") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         class="feather feather-search">
      <title>${title}</title>
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  `;
}

export function iconSkipBackward(title = "První") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-skip-back">
      <title>${title}</title>
      <polygon points="19 20 9 12 19 4 19 20"/>
      <line x1="5" y1="19" x2="5" y2="5"/>
    </svg>
  `;
}

export function iconSkipForward(title = "Poslední") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-skip-forward">
      <title>${title}</title>
      <polygon points="5 4 15 12 5 20 5 4"/>
      <line x1="19" y1="5" x2="19" y2="19"/>
    </svg>
  `;
}

export function iconSlack(title = "Slack") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-slack">
      <title>${title}</title>
      <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/>
      <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/>
      <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/>
      <path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/>
      <path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
      <path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"/>
      <path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/>
    </svg>
  `;
}

export function iconTrash(title = "Smazat") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         class="feather feather-trash-2">
      <title>${title}</title>
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  `;
}

export function iconUserMinus(title = "Odebrat") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         class="feather feather-user-minus">
      <title>${title}</title>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  `;
}

export function iconUserPlus(title = "Přidat") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         class="feather feather-user-plus">
      <title>${title}</title>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  `;
}

export function iconX(title = "Zavřít") {
  return svg`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         class="feather feather-x">
      <title>${title}</title>
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  `;
}
