/**
 * @param {number | null} x Number to be formatted
 * @return {string | null}
 */
export const formatMoney = (x) =>
  x
    ?.toLocaleString("cs", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    ?.replace(/,00/g, ",-") ?? null;

/**
 * @param {number | null} x Number to be formatted
 * @return {string | null}
 */
export const formatNumber = (x) => x?.toLocaleString("cs") ?? null;

/**
 * @param {number | null} x Number to be formatted
 * @returns {string | null}
 */
export const formatPercents = (x) => x != null ? `${Math.round(100 * x).toLocaleString("cs")} %` : null;

/**
 * @param {Date | null} x Date to be formatted
 * @returns {string | null}
 */
export const formatDate = (x) =>
  x?.toLocaleString("cs", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }) ?? null;

/**
 * @param {Date | null} x Date to be formatted
 * @return {string | null}
 */
export const formatShortDate = (x) =>
  x?.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    timeZone: "Europe/Berlin",
  }) ?? null;

/**
 * @param {Date | null} x Date to be formatted
 * @return {string | null}
 */
export const formatTime = (x) =>
  x?.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  }) ?? null;

/**
 * @param {Date | null} x Date to be formatted
 * @return {string | null}
 */
export const formatLongDayName = (x) =>
  x?.toLocaleDateString("cs", {
    weekday: "long",
  }) ?? null;

/**
 * @param {Date | null} x Date to be formatted
 * @return {string | null}
 */
export const formatShortDayName = (x) =>
  x?.toLocaleDateString("cs", {
    weekday: "short",
  }) ?? null;

/**
 * @param {Date | null} x Date to be formatted
 * @return {string | null}
 */
export const formatDateTime = (x) => x?.toLocaleString("cs", { dateStyle: "short", timeStyle: "short" }) ?? null;

export const parseDateTime = (x) => {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{2}) (\d{1,2}):(\d{1,2})$/.exec(x);
  return new Date(m[3], m[2] - 1, m[1], m[4], m[5]);
};
