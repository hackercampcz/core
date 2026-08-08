/**
 * @param {number | null} x Number to be formatted
 * @return {string | null}
 */
export function formatMoney(x) {
  return x != null
    ? Intl.NumberFormat("cs", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(x).replace(/,00/g, ",-")
    : null;
}

/**
 * @param {number | null} x Number to be formatted
 * @return {string | null}
 */
export function formatNumber(x) {
  return x != null ? Intl.NumberFormat("cs").format(x) : null;
}

/**
 * @param {number | null} x Number to be formatted
 * @returns {string | null}
 */
export function formatPercents(x) {
  return x != null ? `${Intl.NumberFormat("cs").format(Math.round(100 * x))} %` : null;
}

/**
 * @param {Date | null} x Date to be formatted
 * @returns {string | null}
 */
export function formatDate(x) {
  return x
    ? Intl.DateTimeFormat("cs", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(x)
    : null;
}

/**
 * @param {Date | null} x Date to be formatted
 * @return {string | null}
 */
export function formatShortDate(x) {
  return x
    ? Intl.DateTimeFormat("cs-CZ", {
      day: "numeric",
      month: "numeric",
      timeZone: "Europe/Prague"
    }).format(x)
    : null;
}

/**
 * @param {Date | null} x Date to be formatted
 * @return {string | null}
 */
export function formatTime(x) {
  return x ? Intl.DateTimeFormat("cs-CZ", { hour: "2-digit", minute: "2-digit" }).format(x) : null;
}

/**
 * @param {Date | null} x Date to be formatted
 * @return {string | null}
 */
export function formatLongDayName(x) {
  return x ? Intl.DateTimeFormat("cs", { weekday: "long" }).format(x) : null;
}

/**
 * @param {Date | null} x Date to be formatted
 * @return {string | null}
 */
export function formatShortDayName(x) {
  return x ? Intl.DateTimeFormat("cs", { weekday: "short" }).format(x) : null;
}

/**
 * @param {Date | null} x Date to be formatted
 * @return {string | null}
 */
export function formatDateTime(x) {
  return x
    ? Intl.DateTimeFormat("cs", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(x)
    : null;
}
