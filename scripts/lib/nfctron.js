import { setTimeout as sleep } from "node:timers/promises";

async function retry(callback, retryCount = 3) {
  let lastResult = null;
  for (let i = 0; i < retryCount; i++) {
    const result = await callback();
    lastResult = result;
    if (result.ok) return result;
    else if (result.status === 404) return null;
    else await sleep(2 ** (i + 1) * 10_000);
  }
  console.log(await lastResult.json());
  throw new Error();
}

export async function getTransactions(chipID) {
  const resp = await retry(() => fetch(`https://api.hackercamp.cz/v2/nfctron/${chipID}`));
  if (!resp) return [];
  const data = await resp.json();
  if (Array.isArray(data.transactions)) {
    return [data.transactions, data.totalSpent / 100];
  }
  return [];
}

export async function getTotalSpent(chipID) {
  const resp = await retry(() => fetch(`https://api.hackercamp.cz/v2/nfctron/${chipID}`));
  if (!resp) return 0;
  const data = await resp.json();
  return (data.totalSpent ?? 0) / 100;
}
