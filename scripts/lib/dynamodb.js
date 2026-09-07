/**
 * The result can be an async iterator or just an array. This collects all the results to the array
 * @param result
 * @returns {Promise<Record<string, any>[]>}
 */
export async function collect(result) {
  if (result.Items) return result.Items;
  const items = [];
  for await (const page of result) {
    items.push(...page.Items);
  }
  return items;
}
