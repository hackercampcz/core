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
    const firstTransaction = data.transactions?.map(x => x.date)?.sort()?.at(0);
    const lastTransaction = data.transactions?.map(x => x.date)?.sort()?.at(-1);
    return [data.transactions, data.totalSpent / 100, firstTransaction, lastTransaction];
  }
  return [];
}

export async function getTotalSpent(chipID) {
  const resp = await retry(() => fetch(`https://api.hackercamp.cz/v2/nfctron/${chipID}`));
  if (!resp) return 0;
  const data = await resp.json();
  return (data.totalSpent ?? 0) / 100;
}

export async function getPairingTable() {
  console.log({ event: "Get NFCTron Chips" });
  const resp = await fetch("https://api.hackercamp.cz/v2/nfctron/");
  const data = await resp.json();
  console.log({data});
  console.log({ event: "Got NFCTron Chips", count: data.length });
  return new Map(data.map(x => [x.serialNumber, { chipID: x.chipId, vip: x.vip }]));
}
