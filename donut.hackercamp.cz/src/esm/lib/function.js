/**
 *
 * @param {function} fn
 * @param {number} delay
 * @returns denounced function
 */
export function debounce(fn, delay = 100) {
  let timer = null;
  return function (...args) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
