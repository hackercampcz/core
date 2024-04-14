async function sleep(number) {
  return new Promise((resolve, reject) => setTimeout(resolve, number));
}

async function retry(callback, retryCount = 3) {
  var lastResult = null;
  for (let i = 0; i < retryCount; i++) {
    const result = await callback();
    lastResult = result;
    if (result.ok) return result;
    else if (result.status === 404) return null;
    else await sleep(2 ** (i + 1) * 10000);
  }
  console.log(await lastResult.json());
  throw new Error();
}

export async function getTransactions(chipID) {
  const resp = await retry(() => fetch(`https://api.nfctron.com/receipt/v2/${chipID}/transaction`));
  if (!resp) return [];
  const data = await resp.json();
  if (Array.isArray(data.transactions)) {
    return [data.transactions, data.totalSpent / 100];
  }
  return [];
}

export async function getTotalSpent(chipID) {
  const resp = await retry(() => fetch(`https://api.nfctron.com/receipt/v2/${chipID}/transaction`));
  if (!resp) return 0;
  const data = await resp.json();
  return (data.totalSpent ?? 0) / 100;
}

async function getAllChips(token) {
  const resp = await fetch(
    "https://api.nfctron.com/app/event/80fbdec6-2775-4edd-9dbc-c0e36b615ac2/customer/chip",
    {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        referer: "https://hub.nfctron.com/",
      },
    },
  );
  const data = await resp.json();
  return data;
}
