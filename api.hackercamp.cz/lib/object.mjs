/**
 * @param {{[p: string]: T}} obj
 * @param {Set} keys
 */
export function selectKeys(obj, keys) {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => keys.has(key))
  );
}
