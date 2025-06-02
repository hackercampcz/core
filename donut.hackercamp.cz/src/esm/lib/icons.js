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

export function iconCheckIn(title = "Check In") {
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

export function iconCheckOut(title = "Check Out") {
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
        <path fill="#FFF" d="M38 35h121v120H38z"/>
        <path fill="currentColor"
              d="M112 122.074c0 6.222 4.938 9.926 13.506 9.926 8.426 0 12.494-4.148 12.494-12.298V112h-6.971c-14.82 0-19.029 3.552-19.029 10.074"/>
        <path fill="currentColor"
              d="M96.005 14C49.061 14 11 44.178 11 81.406v30.183C11 148.817 49.061 179 96.005 179 142.948 179 181 148.817 181 111.59V81.405C181 44.178 142.948 14 96.005 14zm-27.593 99.863h-8.417v32.659h-7.832c-6.243 0-11.757-4.776-11.757-11.58V83.356c0-15.923 7.403-35.862 29.64-40.8 22.51-4.998 28.805 6.002 28.805 6.002s-14.084-.192-25.119 8.413C67.45 61.87 60.215 72.67 59.995 84.952v15.171c13.895 2.66 25.018-1.954 28.3-3.412l.562-.07s-.996 17.222-20.445 17.222zm86.929 6.03c0 16.499-12.186 27.93-29.6 27.93h-3.919c-18.573 0-31.344-10.418-31.344-24.746 0-13.892 10.158-24.456 38.891-24.456h6.818v-1.016c0-10.998-5.223-18.814-16.834-18.814-14.074 0-21.907 5.354-24.812 8.973h-.724v-6.222c0-8.684 7.837-19.101 28.44-19.101 17.414 0 33.084 12.59 33.084 39.505v17.946z"/>
      </g>
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
