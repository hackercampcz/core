export function url(strings, ...values) {
  return String.raw({raw: strings}, ...values.map(x => x instanceof URLSearchParams ? x : encodeURIComponent(x)));
}
