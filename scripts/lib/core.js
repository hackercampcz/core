export function frequencies(xs) {
  return new Map(Array.from(Map.groupBy(xs, x => x)).map(([k, v]) => [k, v.length]));
}
