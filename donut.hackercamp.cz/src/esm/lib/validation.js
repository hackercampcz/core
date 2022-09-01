/**
 * Can be used as new Date(?)
 */
export const isoDateTimeRegex =
  /^(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d)$/;

/**
 *
 * @param {string} value
 * @returns
 */
export function isISODateTime(value) {
  return typeof value === "string" && isoDateTimeRegex.test(value);
}
